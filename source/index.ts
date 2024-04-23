#!/usr/bin/env node
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import Module from 'node:module'
import { realpath } from 'node:fs/promises'
import { install_cjs_hooks } from './cjs-hooks.js'

const [ major, minor, patch ] = process.versions.node.split('.').map(Number)
if (
    (major > 20)
    || (major === 20 && minor >= 6)
    || (major === 18 && minor >= 19)
) {

    // Determine the default module type.
    let defaultModuleType: NodeJS.ModuleType = 'commonjs'
    const argc = process.execArgv.findIndex(arg => arg.startsWith('--experimental-default-type'))
    if (argc >= 0) {
        const argv = process.execArgv[argc].split('=')
        const type = argv.length === 1
            ? process.execArgv[argc + 1]
            : argv[1]
        if (type === 'module' || type === 'commonjs')
            defaultModuleType = type
    }

    // Install the esm hooks -- those are run in a worker thread.
    const self = import.meta.url
    Module.register<NodeJS.InitializeHookData>('./esm-hooks.js', {
        parentURL: self,
        data: {
            self,
            defaultModuleType
        }
    })

    // Install the cjs hooks -- those are run synchronously in the main thread.
    install_cjs_hooks(defaultModuleType)

    // Enable source map support.
    process.setSourceMapsEnabled(true)

    // If we're not run via Node's --import flag but rather via
    // `ts-run <script>` or `node path/to/this/file.js <script>`,
    // get the name of the real entry point from the command line,
    // remove us from argv then dynamically import the real entry point.
    const entryPoint = process.argv[2]
    if (process.argv[1] === fileURLToPath(self) && entryPoint) {
        try {
            process.argv[1] = await realpath(entryPoint)
        }
        catch {
            process.argv[1] = path.resolve(entryPoint)
        }
        process.argv.splice(2, 1)

        await import(entryPoint)
    }
}
else {
    throw new Error(`Unsupported NodeJS version ${major}.${minor}.${patch}. ts-run requires Node 18.19.0+, Node 20.6.0+ or Node 21+.`)
}
