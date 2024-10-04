import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { readFile } from 'node:fs/promises'
import { transform } from './transform.cjs'
import type { InitializeHook, ResolveHook, LoadHook } from 'node:module'

const jsExtRx = /\.([cm])?js$/
const tsExtRx = /\.([cm])?ts$/

const hookData: HookData = Object.create(null)
export const initialize: InitializeHook<HookData> = ({ self, defaultModuleType }) => {
    hookData.self = self
    hookData.defaultModuleType = defaultModuleType
}

export const resolve: ResolveHook = async (specifier, context, nextResolve) => {
    // when run with `ts-run <script>` or `node path/to/index.js <script>`,
    // we need to resolve the entry <script> specifier relative to process.cwd()
    // because otherwise Node would resolve it relative to our own index.js.
    if (context.parentURL === hookData.self) {
        context = {
            ...context,
            parentURL: undefined
        }

        // Likewise, since *we* are the actual entry point, a bare <script> specifier
        // would be searched for in node_modules. This is probably not what the user
        // expects.
        if (!/^\.\.?\//.test(specifier)) {
            specifier = path.isAbsolute(specifier)
                ? specifier = pathToFileURL(specifier).href // On Windows, absolute paths must be valid file:// URLs.
                : specifier = './' + specifier
        }
    }

    // Try first with the .ts extension, otherwise go as-is.
    try {
        return await nextResolve(specifier.replace(jsExtRx, '.$1ts'), context)
    }
    catch {
        return nextResolve(specifier, context)
    }
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
