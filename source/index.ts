#!/usr/bin/env node
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import module from 'node:module'
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
    const argIndex = process.execArgv.findIndex(arg => arg.startsWith('--experimental-default-type'))
    if (argIndex >= 0) {
        const type = process.execArgv[argIndex].split('=')[1] || process.execArgv[argIndex + 1]
        if (type === 'module' || type === 'commonjs')
            defaultModuleType = type
    }

    // Register the esm hooks -- those are run in a worker thread.
    const self = import.meta.url
    module.register<NodeJS.InitializeHookData>('./esm-hooks.js', {
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
    // `ts-run <script>` or `node path/to/this/file.js <script>`, then:
    // - (A): get the name of the real entry point from the command line
    //        (the first argument that does not start with a dash)
    // - (B): replace us in argv with that entry point
    // - (C): dynamically import the real entry point.
    if (process.argv[1] === fileURLToPath(self)) {

        // (A)
        let realEntryPointIndex = -1
        for (let i = 2; i < process.argv.length; i++) {
            const arg = process.argv[i]
            if (!arg.startsWith('-')) {
                realEntryPointIndex = i;
                break
            }
            if (arg === '--')   // Ignore everything after --
                break
        }

        if (realEntryPointIndex > 0) {
            const realEntryPoint = process.argv[realEntryPointIndex]

            // (B)
            process.argv[1] = await realpath(realEntryPoint).catch(() => path.resolve(realEntryPoint))
            process.argv.splice(realEntryPointIndex, 1)

            // (C)
            await import(realEntryPoint)
        }
        else if (process.argv.includes('-v')) {
            // Respond to `ts-run -v`
            const { name, version } = module.createRequire(self)('../package.json') as typeof import('../package.json')
            console.log(`Node.js v${major}.${minor}.${patch}, ${name.split('/').pop()} v${version}`)
        }
    }
}
else {
    throw new Error(`Unsupported NodeJS version ${major}.${minor}.${patch}. ts-run requires Node 18.19.0+, Node 20.6.0+ or Node 21+.`)
}
