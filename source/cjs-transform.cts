import { transform as sucrase, type Transform, type TransformResult } from 'sucrase'

const transforms: Record<NodeJS.ModuleType, Transform[]> = {
    commonjs: [ 'typescript', 'imports' ],
    module: [ 'typescript' ]
}

export function transform(source: string, format: NodeJS.ModuleType, filePath: string) {
    const { code, sourceMap } = sucrase(source, {
        filePath,
        transforms: transforms[format],
        preserveDynamicImport: true,
        disableESTransforms: true,
        injectCreateRequireForImportRequire: true,
        keepUnusedImports: true,
        sourceMapOptions: {
            compiledFilename: filePath
        }
    }) as Required<TransformResult>

    sourceMap.sourceRoot = ''
    sourceMap.sources = [ filePath ]
    // sourceMap.sourcesContent = [ source ]

    return code + '\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,'
                + Buffer.from(JSON.stringify(sourceMap)).toString('base64')
}
