#!/usr/bin/env node
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const { argv } = process
if (argv.length >= 3 && !argv[2].startsWith('-')) {

    // Get the name of the real <script> entry point from the command line,
    // replace us in argv with that entry point, then dynamically import it.
    argv[1] = resolve(argv[2])
    argv.splice(2, 1)
    await import('../lib/register.js')
    await import(pathToFileURL(argv[1]).href)
}
else {
    const { name, version } = createRequire(import.meta.url)('#package.json') as typeof import('#package.json')
    const shortName = name.split('/').pop()!

    // Respond to `ts-run [-v | --version]` or print usage.
    if (argv.length === 3 && /^-v|--version$/.test(argv[2])) {
        console.log(`Node.js v${process.versions.node}, ${shortName} v${version}`)
    }
    else {
        console.log(`Usage: ${shortName} -v | <script.ts>`)
    }
}
