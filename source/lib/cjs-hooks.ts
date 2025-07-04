import path from 'node:path'
import module from 'node:module'
import { readFileSync } from 'node:fs'

const require = module.createRequire(import.meta.url)
const jsExtRx = /\.([cm])?js$/

function transpile(m: module, format: NodeJS.ModuleType, filePath: string) {
    // Notes:
    // - This function is called by the CJS loader so it must be sync.
    // - We lazy-load Sucrase as the CJS loader may well never be used
    //   at all, as ESM scripts are becoming more and more frequent.
    //   This infers a very small performance penalty when transpile() is called
    //   for the fist time, but we'll live with it.
    const { transform } = require('./transform.cjs') as typeof import('./transform.cjs')
    const source = readFileSync(filePath).toString()
    const code = transform(source, format, path.basename(filePath))
    return m._compile(code, filePath)
}

const pkgTypeCache = new Map<string, NodeJS.ModuleType | null>()
function nearestPackageType(file: string, defaultType: NodeJS.ModuleType): NodeJS.ModuleType {
    for (
        let current = path.dirname(file), previous: string | undefined = undefined;
        previous !== current;
        previous = current, current = path.dirname(current)
    ) {
        const pkgFile = path.join(current, 'package.json')
        let cached = pkgTypeCache.get(pkgFile)
        if (cached === undefined) {
            try {
                const data = readFileSync(pkgFile)
                const { type } = JSON.parse(data.toString()) as PackageJson
                cached = type === 'module' || type ==='commonjs'
                    ? type
                    : defaultType
            }
            catch(err) {
                const { code } = err as NodeJS.ErrnoException
                if (code !== 'ENOENT')
                    console.error(err)
                cached = null
            }

            pkgTypeCache.set(pkgFile, cached)
        }

        if (typeof cached === 'string')
            return cached
    }

    return defaultType
}

export function installCjsHooks(defaultModuleType: NodeJS.ModuleType) {
    const { _resolveFilename } = module
    module._resolveFilename = function _resolveFilenamePatch(request, ...otherArgs) {
        try {
            // Let's try first with the .ts extension...
            return _resolveFilename.call(module, request.replace(jsExtRx, '.$1ts'), ...otherArgs)
        }
        catch {
            // Otherwise, go as-is.
            return _resolveFilename.call(module, request, ...otherArgs)
        }
    }

    module._extensions['.ts']  = (m, filename) => transpile(m, nearestPackageType(filename, defaultModuleType), filename)
    module._extensions['.cts'] = (m, filename) => transpile(m, 'commonjs', filename)
    module._extensions['.mts'] = (m, filename) => transpile(m, 'module', filename)
}
