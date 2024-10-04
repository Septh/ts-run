import assert from 'node:assert/strict'
import module from 'node:module'
import { installCjsHooks } from './cjs-hooks.js'

const [ major, minor, patch ] = process.versions.node.split('.').map(Number)
assert(
    major >= 21 || (major === 20 && minor >= 6) || (major === 18 && minor >= 19),
    `Unsupported NodeJS version ${major}.${minor}.${patch}. ts-run requires Node 18.19.0+, Node 20.6.0+ or Node 21+.`
)

// Enable source map support.
process.setSourceMapsEnabled(true)

// Determine the default module type.
let defaultModuleType: NodeJS.ModuleType = 'commonjs'
const argIndex = process.execArgv.findIndex(arg => /^--(?:experimental-)?default-type/.test(arg))
if (argIndex >= 0) {
    const type = process.execArgv[argIndex].split('=')[1] || process.execArgv[argIndex + 1]
    if (type === 'module' || type === 'commonjs')
        defaultModuleType = type
}

// Register the esm hooks -- those are run in a worker thread.
const self = import.meta.url
module.register<HookData>('./esm-hooks.js', {
    parentURL: self,
    data: {
        self,
        defaultModuleType
    }
})

// Install the cjs hooks -- those are run synchronously in the main thread.
installCjsHooks(defaultModuleType)
