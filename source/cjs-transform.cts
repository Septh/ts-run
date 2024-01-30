/// <reference types="./ambient.d.ts" />

import { transform as _transform, type Transform } from 'sucrase'

const transforms: Record<NodeJS.ModuleType, Transform[]> = {
    commonjs: [ 'typescript', 'imports' ],
    module: [ 'typescript' ]
}

export function transform(source: string, format: NodeJS.ModuleType, filePath: string) {
    const { code, sourceMap } = _transform(source, {
        transforms: transforms[format],
        preserveDynamicImport: true,
        disableESTransforms: true,
        keepUnusedImports: true,
        filePath,
        sourceMapOptions: {
            compiledFilename: filePath
        }
    })

    return { code, sourceMap }
}
