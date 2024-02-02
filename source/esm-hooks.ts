import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFile } from 'node:fs/promises'
import { type InitializeHook, type ResolveHook, type LoadHook, type ModuleSource, createRequire } from 'node:module'

const transformer = createRequire(import.meta.url)('./cjs-transform.cjs')

let self: string
export const initialize: InitializeHook<string> = data => {
    self = data
}

export const resolve: ResolveHook = async (specifier, context, nextResolve) => {
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

        if (/^\w/.test(specifier) && !path.isAbsolute(specifier))
            specifier = './' + specifier

        return {
            ...await nextResolve(specifier, context),
            shortCircuit: true
        }
    }

    // Normal operation otherwise.
    return nextResolve(specifier, context)
}

function transpile(source: ModuleSource, format: NodeJS.ModuleType, filePath: string) {
    const { code, sourceMap } = transformer.transform(source.toString(), format, filePath)
    return code
        + '\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,'
        + Buffer.from(JSON.stringify(sourceMap)).toString('base64')
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
            format = await readFile(pkgFile, 'utf-8')
                .then(data => (JSON.parse(data) as NodeJS.PkgType).type ?? unknownType)
                .catch(err => {
                    const { code } = err as NodeJS.NodeError
                    if (code !== 'ENOENT')
                        console.error(err)
                    return unknownType
                })
            pkgTypeCache.set(pkgFile, format)
        }

        if (typeof format === 'string')
            return format
    }

    // TODO: decide default format based on --experimental-default-type
    return 'commonjs'
}

export const load: LoadHook = async (url, context, nextLoad) => {

    // If this is not a TypeScript file, defer to the next hook in the chain.
    const { protocol, pathname } = new URL(url)
    const ext = /(\.[cm]?ts)$/.exec(pathname)
    if (protocol !== 'file:' || !ext)
        return nextLoad(url, context)

    // Determine the output format based on the file's extension
    // or the nearest package.json's `type` field.
    const filePath = fileURLToPath(url)
    const format: NodeJS.ModuleType = (
        ext[1] === '.ts'
            ? await nearestPackageType(filePath)
            : ext[1] === '.mts'
                ? 'module'
                : 'commonjs'
    )

    // Notes:
    // - Node doesn't yet care about the file contents at this point
    //   so we're fine calling nextLoad() to do the actual loading
    // - if null is returned for `source`, the CJS loader will be used instead
    let { source } = await nextLoad(url, { ...context, format })
    if (source)
        source = transpile(source, format, filePath)

    return {
        source,
        format,
        shortCircuit: true,
    }
}
