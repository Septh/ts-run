import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { readFile } from 'node:fs/promises'
import { createRequire, type InitializeHook, type ResolveHook, type LoadHook } from 'node:module'

const { transform } = createRequire(import.meta.url)('./transform.cjs') as typeof import('./transform.cjs')

let self: string
let defaultModuleType: NodeJS.ModuleType
export const initialize: InitializeHook<NodeJS.InitializeHookData> = data => {
    self = data.self
    defaultModuleType = data.defaultModuleType
}

export const resolve: ResolveHook = (specifier, context, nextResolve) => {
    // when run with `ts-run <script>` or `node path/to/index.js <script>`,
    // we need to resolve the entry point specifier relative to process.cwd()
    // because otherwise Node would resolve it relative to our own index.js.
    //
    // FIXME: this prevents running a script from node_modules with a bare specifier,
    //        we may want to add support for this later.
    if (context.parentURL === self) {
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

    return nextResolve(specifier, context)
}

const unknownType = Symbol()
const pkgTypeCache = new Map<string, NodeJS.ModuleType | Symbol>()
async function nearestPackageType(file: string): Promise<NodeJS.ModuleType> {
    for (
        let current = path.dirname(file), previous: string | undefined = undefined;
        previous !== current;
        previous = current, current = path.dirname(current)
    ) {
        const pkgFile = path.join(current, 'package.json')
        let format = pkgTypeCache.get(pkgFile)
        if (!format) {
            format = await readFile(pkgFile)
                .then(data => {
                    const { type } = JSON.parse(data.toString()) as PackageJson
                    return type === 'module' || type === 'commonjs'
                        ? type
                        : unknownType
                })
                .catch(err => {
                    const { code } = err as NodeJS.ErrnoException
                    if (code !== 'ENOENT')
                        console.error(err)
                    return unknownType
                })
            pkgTypeCache.set(pkgFile, format)
        }

        if (typeof format === 'string')
            return format
    }

    return defaultModuleType
}

export const load: LoadHook = async (url, context, nextLoad) => {

    // If this is not a TypeScript file, defer to the next hook in the chain.
    const { protocol, pathname } = new URL(url)
    const [ , ext ] = /(\.[cm]?ts)$/.exec(pathname) ?? []
    if (protocol !== 'file:' || !ext)
        return nextLoad(url, context)

    // Determine the output format based on the file's extension
    // or the nearest package.json's `type` field.
    const filePath = fileURLToPath(url)
    const format: NodeJS.ModuleType = (
        ext === '.ts'
            ? await nearestPackageType(filePath)
            : ext === '.mts'
                ? 'module'
                : 'commonjs'
    )

    // Notes:
    // - Node doesn't yet care about the file contents at this point
    //   so we're fine calling nextLoad() to do the actual loading
    // - if null is returned for `source`, the CJS loader will be used instead
    let { source } = await nextLoad(url, { ...context, format })
    if (source)
        source = transform(source.toString(), format, path.basename(filePath))

    return {
        source,
        format,
        shortCircuit: true,
    }
}
