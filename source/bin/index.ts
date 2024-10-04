#!/usr/bin/env node
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const { argv } = process
if (argv.length >= 3 && !argv[2].startsWith('-')) {

    // Get the name of the real <script> entry point from the command line,
    // replace us in argv with that entry point, then dynamically import it.
    argv.splice(1, 2, resolve(argv[2]))
    await import('../lib/register.js')
    await import(pathToFileURL(argv[1]).href)
}
else if (argv.length === 3 && /^-v|--version$/.test(argv[2])) {
    // Respond to `ts-run [-v | --version]` or print usage.
    console.log(`Node.js v${process.versions.node}, __TSRUN_NAME__ v__TSRUN_VERSION__`)
}
else {
    console.log('Usage: __TSRUN_NAME__ -v | <script.ts>')
}
