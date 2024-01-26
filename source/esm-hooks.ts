import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFile } from 'node:fs/promises'
import type { InitializeHook, ResolveHook, LoadHook, ModuleSource } from 'node:module'
import { transform, type Transform } from 'sucrase'

type ModuleFormat = 'commonjs' | 'module'

interface PkgType {
    type?: string
}

let entryPoint: string | undefined
export const initialize: InitializeHook<string | undefined> = scriptName => {
    entryPoint = scriptName
}

export const resolve: ResolveHook = async (specifier, context, nextResolve) => {
    // console.log(`specifier = ${specifier}, entryPoint = ${entryPoint}, context.parentURL = ${context.parentURL}`)

    // There are 4 possible scenarios:
    //
    // A) ts-run script.ts
    //    => specifier = entryPoint = script.ts, context.parentURL = url of ./index.js
    //
    // B) node <path-to-index.js> script.ts
    //    => specifier = entryPoint = script.ts, context.parentURL = url of ./index.js (same as A)
    //
    // C) node --import @septh/ts-run/register script.ts
    //    => specifier = url of script.ts, entryPoint = undefined, context.parentURL = undefined
    //
    // D) import something from 'specifier' (inside a script)
    //    => specifier = specifier, entryPoint is irrevelant, context.parentURL = url of importer
    //

    // Scenarios C and D:
    //   We just let Node resolve the specifier as we have no added value in these cases.
    if (specifier !== entryPoint || context.parentURL === undefined)
        return nextResolve(specifier, context)

    // Scenarios A and B:
    //   If called from the CLI, we need to resolve specifier relative to process.cwd because otherwise
    //   Node would resolve it relative to our own directory.
    //
    //   FIXME: this prevents running a script from node_modules with a bare specifier,
    //          we may want to add support for this at some point.
    context = { ...context }
    if (specifier === entryPoint) {
        context.parentURL = undefined
        if (/^\w/.test(specifier) && !path.isAbsolute(specifier))
            specifier = './' + specifier
    }

    return {
        ...await nextResolve(specifier, context),
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

async function nearestPackageType(file: string): Promise<ModuleFormat> {
    for (
        let current = path.dirname(file), previous: string | undefined = undefined;
        previous !== current;
        previous = current, current = path.dirname(current)
    ) {
        const type = await readFile(path.join(current, 'package.json'), 'utf-8')
            .then(data => (JSON.parse(data) as PkgType).type)
            .catch(err => {
                if (err.code !== 'ENOENT')
                    console.error(err)
                return undefined
            })
        if (type === 'module' || type === 'commonjs')
            return type
    }

    // TODO: check Node's `--experimental-default-type` flag, but how?
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
