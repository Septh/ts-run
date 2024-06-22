import * as sucrase from 'sucrase'

const transforms: Record<NodeJS.ModuleType, sucrase.Transform[]> = {
    commonjs: [ 'typescript', 'imports' ],
    module: [ 'typescript' ]
}

export function transform(source: string, format: NodeJS.ModuleType, filePath: string) {
    const { code, sourceMap } = sucrase.transform(source, {
        filePath,
        transforms: transforms[format],
        preserveDynamicImport: true,
        disableESTransforms: true,
        injectCreateRequireForImportRequire: true,
        sourceMapOptions: {
            compiledFilename: filePath
        }
    }) as Required<sucrase.TransformResult>

    sourceMap.sourceRoot = ''
    sourceMap.sources = [ filePath ]
    // sourceMap.sourcesContent = [ source ]

    return code + '\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,'
                + Buffer.from(JSON.stringify(sourceMap)).toString('base64')
}
