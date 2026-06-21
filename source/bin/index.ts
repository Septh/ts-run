#!/usr/bin/env node
import { resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'

const { argv } = process
if (argv.length >= 3 && !argv[2].startsWith('-')) {

    // Register the loaders.
    await import('../lib/register.js')

    // Get the name of script to run from the command line,
    // replace us in argv with that name, then dynamically import the script.
    argv.splice(1, 2, resolve(argv[2]))
    await import(pathToFileURL(argv[1]).href)
}
else {
    // Respond to `ts-run -v | --version` or print usage.
    const { name, version } = createRequire(import.meta.url)('#package.json') as typeof import('#package.json')
    const shortName = name.split('/').pop()

    if (argv.length > 2) {
        if (argv[2] === '-v' || argv[2] === '--version')
            console.info(`Node.js v${process.versions.node}, ${shortName} v${version}`)
        else if (argv[2].startsWith('-')) {
            console.error(`${shortName}: unknown argument ${argv[2]}. Script arguments must be written *after* the name of the script.`)
            process.exitCode = 1
        }
    }
    else console.info(`Usage: ${shortName} -v | path${sep}to${sep}script.ts`)
}
