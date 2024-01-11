import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFile } from 'node:fs/promises'
import type { InitializeHook, ResolveHook, LoadHook, ModuleSource } from 'node:module'
import { transform, type Transform } from 'sucrase'

type ModuleFormat = 'commonjs' | 'module'

interface PkgType {
    type?: ModuleFormat
}

let entryPoint: string
export const initialize: InitializeHook<string> = scriptName => {
    entryPoint = scriptName
}

export const resolve: ResolveHook = async (specifier, context, nextResolve) => {

    // We only need to manually resolve the script entry point relative to path.cwd()
    // because otherwise, Node would resolve it relative to our own directory.
    // So, 1/ we let Node handle all other specifiers beyond the entry point...
    if (specifier !== entryPoint || context.parentURL === undefined)
        return nextResolve(specifier, context)

    // And 2/, we make sure the entry point is either relative or absolute.
    // FIXME: this prevents running a script from node_modules,
    //        we may want to add support for this at some point.
    if (/^\w/.test(specifier) && !path.isAbsolute(specifier))
        specifier = './' + specifier

    // Apart from that, there is nothing special here.
    return {
        ...await nextResolve(specifier, { ...context, parentURL: undefined }),
        shortCircuit: true
    }
}

const transforms: Record<ModuleFormat, Transform[]> = {
    commonjs: [ 'typescript', 'imports' ],
    module: [ 'typescript' ]
}

function transpile(source: ModuleSource, format: ModuleFormat, filePath: string) {

    const { code, sourceMap } = transform(source.toString(), {
        transforms: transforms[format],
        preserveDynamicImport: true,
        disableESTransforms: true,
        keepUnusedImports: true,
        filePath,
        sourceMapOptions: {
            compiledFilename: filePath
        }
    })

    return code
        + '\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,'
        + Buffer.from(JSON.stringify(sourceMap)).toString('base64')
}

async function nearestPackageType(file: string) {
    for (
        let current = path.dirname(file), previous: string | undefined;
        previous !== current;
        previous = current, current = path.dirname(current)
    ) {
        const type = await readFile(path.join(current, 'package.json'), 'utf-8')
            .then(data => (JSON.parse(data) as PkgType).type)
            .catch(err => {
                if (err.code !== 'ENOENT')
                    console.error(err)
            })

        // FIXME: we should probably check the type before returning it...
        if (type) return type
    }

    // TODO: check --experimental-default-type flag
    return 'commonjs'
}

export const load: LoadHook = async (url, context, nextLoad) => {

    // If this is not a TypeScript file, defer to the next hook in the chain.
    const parsed = new URL(url)
    const ext = /(\.[cm]?ts)$/.exec(url)
    if (parsed.protocol !== 'file:' || !ext)
        return nextLoad(url, context)

    // Determine the output format based on file extension
    // or the nearest package.json's `type` field.
    const filePath = fileURLToPath(url)
    const format: ModuleFormat = (
        ext[1] === '.cts'
            ? 'commonjs'
            : ext[1] === '.mts'
                ? 'module'
                : await nearestPackageType(filePath)
    )

    // Let Node do the actual loading before transpiling the file.
    // Notes:
    // - Node doesn't yet care about the file contents at this point
    //   so we're fine call nextLoad()
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
