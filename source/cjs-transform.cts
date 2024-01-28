import { transform as _transform, type Transform } from 'sucrase'

const transforms: Record<string, Transform[]> = {
    commonjs: [ 'typescript', 'imports' ],
    module: [ 'typescript' ]
}

export function transform(source: string, format: 'module' | 'commonjs', filePath: string) {
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
