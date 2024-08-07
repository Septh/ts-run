import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { readFile } from 'node:fs/promises'
import type { InitializeHook, ResolveHook, LoadHook } from 'node:module'

const hookData: HookData = Object.create(null)
const jsExtRx = /\.([cm])?js$/
const tsExtRx = /\.([cm])?ts$/
const { transform } = await import('./transform.cjs')

export const initialize: InitializeHook<HookData> = ({ self, defaultModuleType }) => {
    hookData.self = self
    hookData.defaultModuleType = defaultModuleType
}

export const resolve: ResolveHook = async (specifier, context, nextResolve) => {
    // when run with `ts-run <script>` or `node path/to/index.js <script>`,
    // we need to resolve the <script> specifier relative to process.cwd()
    // because otherwise Node would resolve it relative to our own index.js.
    //
    // FIXME: this prevents running a script from node_modules with a bare specifier,
    //        we may want to add support for this later.
    if (context.parentURL === hookData.self) {
        context = {
            ...context,
            parentURL: undefined
        }

        if (path.isAbsolute(specifier)) {
            // On Windows, absolute paths must be valid file:// URLs.
            specifier = pathToFileURL(specifier).href
        }
        else if (/^\w/.test(specifier))
            specifier = './' + specifier
    }

    let result: ReturnType<ResolveHook>
    try {
        result = await nextResolve(specifier, context)
    }
    catch {
        result = await nextResolve(specifier.replace(jsExtRx, '.$1ts'), context)
    }
    return result
}

const pkgTypeCache = new Map<string, NodeJS.ModuleType | null>()
async function nearestPackageType(file: string): Promise<NodeJS.ModuleType> {
    for (
        let current = path.dirname(file), previous: string | undefined = undefined;
        previous !== current;
        previous = current, current = path.dirname(current)
    ) {
        const pkgFile = path.join(current, 'package.json')
        let cached = pkgTypeCache.get(pkgFile)
        if (cached === undefined) {
            cached = await readFile(pkgFile)
                .then(data => {
                    const { type } = JSON.parse(data.toString()) as PackageJson
                    return type === 'module' || type === 'commonjs'
                        ? type
                        : hookData.defaultModuleType
                })
                .catch(err => {
                    const { code } = err as NodeJS.ErrnoException
                    if (code !== 'ENOENT')
                        console.error(err)
                    return null
                })
            pkgTypeCache.set(pkgFile, cached)
        }

        if (typeof cached === 'string')
            return cached
    }

    return hookData.defaultModuleType
}

export const load: LoadHook = async (url, context, nextLoad) => {

    // If this is not a TypeScript file, defer to the next hook in the chain.
    const fileUrl = new URL(url)
    const { protocol, pathname } = fileUrl
    const [ ext ] = tsExtRx.exec(pathname) ?? []
    if (protocol !== 'file:' || !ext)
        return nextLoad(url, context)

    // Determine the output format based on the file's extension
    // or the nearest package.json's `type` field.
    const filePath = fileURLToPath(fileUrl)
    const format = context.format ?? (
        ext === '.ts'
            ? await nearestPackageType(filePath)
            : ext === '.mts'
                ? 'module'
                : 'commonjs'
    )

    if (format !== 'module' && format !== 'commonjs')
        return nextLoad(url, context)

    // Load and transform the file.
    const source = await readFile(filePath)
        .then(buffer => transform(buffer.toString(), format, path.basename(filePath)))
        .catch(() => undefined)

    return {
        source,
        format,
        shortCircuit: true,
    }
}
