#!/usr/bin/env node
import path from 'node:path'
import Module from 'node:module'
import { realpath } from 'node:fs/promises'
import { install_cjs_hooks } from './cjs.js'

const [ major, minor, patch ] = process.versions.node.split('.').map(Number)
if (
    (major > 20)
    || (major === 20 && minor >= 6)
    || (major === 18 && minor >= 19)
) {

    // Get the name of the script to run from the command line.
    // Do not error out if there is none because:
    // - either we were invoked with no script name and we'll
    //   just end up doing nothing;
    // - or we were inkvoked via Node's --import option
    const scriptName = process.argv
        .slice(2)
        .filter(arg => !arg.startsWith('-'))
        .at(0)

    // Install the esm hooks -- those are run in a worker thread
    Module.register('./esm-hooks.js', {
        parentURL: import.meta.url,
        data: scriptName
    })

    // Install the cjs hooks -- those are run synchronously in the main thread
    install_cjs_hooks()

    // Enable source map support
    process.setSourceMapsEnabled(true)

    // Adjust process.argv to hide us from the script to run
    if (scriptName) {
        try {
            process.argv[1] = await realpath(path.resolve(scriptName))
        }
        catch {
            process.argv[1] = path.resolve(scriptName)
        }
        process.argv.splice(process.argv.indexOf(scriptName), 1)

        // Dynamically import the script entry point
        // (note that this will fallback to the legacy cjs loader
        // if the script happens to be commonjs)
        await import(scriptName)
    }
}
else {
    console.error(`Unsupported NodeJS version, expected Node 18.19.0+, Node 20.6.0+ or Node 21+ but found ${major}.${minor}.${patch}`)
    process.exitCode = 1
}
