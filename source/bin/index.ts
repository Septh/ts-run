#!/usr/bin/env node
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'

const { argv } = process
if (argv.length >= 3 && !argv[2].startsWith('-')) {
    // Register the loaders.
    await import('../lib/register.js')

    // Get the name of the real script entry point from the command line,
    // replace us in argv with that entry point, then dynamically import it.
    argv.splice(1, 2, resolve(argv[2]))
    await import(pathToFileURL(argv[1]).href)
}
else {
    // Print usage.
    const { name } = createRequire(import.meta.url)('#package.json') as typeof import('#package.json')
    console.log(`Usage: ${name} path/to/script.ts`)
}
