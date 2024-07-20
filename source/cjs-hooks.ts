import path from 'node:path'
import Module, { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'

const require = createRequire(import.meta.url)
const jsExtRx = /\.([cm])?js$/

function transpile(m: Module, format: NodeJS.ModuleType, filePath: string) {
    // Notes:
    // - This function is called by the CJS loader so it must be sync.
    // - We lazy-load Sucrase as the CJS loader may well never be used
    //   at all, as ESM scripts are becoming more and more frequent.
    //   This infers a very small performance penalty when transpile() is called
    //   for the fist time, but we'll live with it.
    const { transform } = require('./transform.cjs') as typeof import('./transform.cjs')
    const source = readFileSync(filePath.replace(jsExtRx, '.$1ts')).toString()
    const code = transform(source, format, path.basename(filePath))
    return m._compile(code, filePath)
}

const unknownType = Symbol()
const pkgTypeCache = new Map<string, NodeJS.ModuleType | Symbol>()
function nearestPackageType(file: string, defaultType: NodeJS.ModuleType): NodeJS.ModuleType {
    for (
        let current = path.dirname(file), previous: string | undefined = undefined;
        previous !== current;
        previous = current, current = path.dirname(current)
    ) {
        const pkgFile = path.join(current, 'package.json')
        let format = pkgTypeCache.get(pkgFile)
        if (!format) {
            try {
                const data = readFileSync(pkgFile, 'utf-8')
                const { type } = JSON.parse(data) as PackageJson
                format = type === 'module' || type ==='commonjs'
                    ? type
                    : unknownType
            }
            catch(err) {
                const { code } = err as NodeJS.ErrnoException
                if (code !== 'ENOENT')
                    console.error(err)
                format = unknownType
            }

            pkgTypeCache.set(pkgFile, format)
        }

        if (typeof format === 'string')
            return format
    }

    return defaultType
}

export function install_cjs_hooks(defaultType: NodeJS.ModuleType) {
    const { _resolveFilename } = Module
    Module._resolveFilename = function(request, ...otherArgs) {
        try {
            return _resolveFilename.call(undefined, request, ...otherArgs)
        }
        catch {
            return _resolveFilename.call(undefined, request.replace(jsExtRx, '.$1ts'), ...otherArgs)
        }
    }

    Module._extensions['.ts']  = (m, filename) => transpile(m, nearestPackageType(filename, defaultType), filename)
    Module._extensions['.cts'] = (m, filename) => transpile(m, 'commonjs', filename)
    Module._extensions['.mts'] = (m, filename) => transpile(m, 'module', filename)
}
