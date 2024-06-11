// @ts-check
const ver = parseFloat(process.versions.node)
if (ver < 21.0) {
    console.error([
        'Because of the glob pattern in the Node command line, you need to use Node 21+ to run the tests',
        '(see https://github.com/nodejs/node/issues/50658#issuecomment-1806581766 for more info).',
        '',
        'Use nvm or a similar tool to manage multiple NodeJS installations on your machine.',
    ].join('\n'))
    process.exitCode = 1
}
