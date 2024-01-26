import path from 'node:path'
import Module from 'node:module'
import { readFileSync } from 'node:fs'
import type { Transform } from 'sucrase'

type ModuleFormat = 'commonjs' | 'module'
interface NodeError extends Error {
    code?: string
}

interface PkgType {
    type?: ModuleFormat
}

const require = Module.createRequire(import.meta.url)

const transforms: Record<ModuleFormat, Transform[]> = {
    commonjs: [ 'typescript', 'imports' ],
    module: [ 'typescript' ]
}

function transpile(m: Module, format: ModuleFormat, filePath: string) {
    // Notes:
    // - This function is called by the CJS loader so it must be sync.
    // - We lazy load Sucrase as the CJS loader may well never be used
    //   at all, as ESM scripts are becoming more and more frequent.
    //   This infers a small performance penalty when transpile() is called
    //   for the fist time, but we'll live with it.
    const { readFileSync } = require('node:fs') as typeof import('node:fs')
    const { transform } = require('sucrase') as typeof import('sucrase')

    const source = readFileSync(filePath).toString()
    const { code, sourceMap } = transform(source, {
        transforms: transforms[format],
        preserveDynamicImport: true,
        disableESTransforms: true,
        keepUnusedImports: true,
        filePath,
        sourceMapOptions: {
            compiledFilename: filePath
        }
    })

    return m._compile(
        code
            + '\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,'
            + Buffer.from(JSON.stringify(sourceMap)).toString('base64'),
        filePath
    )
}

const noType = Symbol()
const typeCache = new Map<string, ModuleFormat | Symbol>()
function nearestPackageType(file: string): ModuleFormat {
    for (
        let current = path.dirname(file), previous: string | undefined = undefined;
        previous !== current;
        previous = current, current = path.dirname(current)
    ) {
        const pkgFile = path.join(current, 'package.json')
        let format = typeCache.get(pkgFile)
        if (!format) {
            try {
                const data = readFileSync(pkgFile, 'utf-8')
                format = (JSON.parse(data) as PkgType).type
            }
            catch(err) {
                const { code } = err as NodeError
                if (code !== 'ENOENT')
                    console.error(err)
            }
            typeCache.set(pkgFile, format ?? noType)
        }

        if (format === 'module' || format === 'commonjs')
            return format
    }

    // TODO: check --experimental-default-type flag, but how?
    return 'commonjs'
}

export function install_cjs_hooks() {
    Module._extensions['.ts']  = (m, filename) => transpile(m, nearestPackageType(filename), filename)
    Module._extensions['.cts'] = (m, filename) => transpile(m, 'commonjs', filename)
    Module._extensions['.mts'] = (m, filename) => transpile(m, 'module', filename)
}
