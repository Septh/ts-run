import module from 'node:module'

const [ major, minor, patch ] = process.versions.node.split('.').map(Number)
if (!(major >= 21 || (major === 20 && minor >= 6) || (major === 18 && minor >= 19))) {
    const { name } = module.createRequire(import.meta.url)('#package.json') as typeof import('#package.json')
    throw new Error(`Unsupported NodeJS version ${major}.${minor}.${patch}. ${name} requires Node 18.19.0+, Node 20.6.0+ or Node 21+.`)
}

// Enable source map support.
process.setSourceMapsEnabled(true)

if (major >= 25) {
    // Node >= 25: register the sync hooks for both esm and cjs.
    const { hooks } = await import('./hooks.js')
    module.registerHooks(hooks)

    // And install the cjs hooks as well
    // https://github.com/nodejs/node/pull/62920 fix in 26.2
    if (major < 26 || minor < 2) {
        const { installCjsHooks } = await import('./hooks-legacy.js')
        installCjsHooks()
    }
}
else {
    // Node < 25: register the legacy async esm hooks and cjs sync hooks.
    module.register('./hooks-legacy.js')

    // And install the cjs hooks as well
    const { installCjsHooks } = await import('./hooks-legacy.js')
    installCjsHooks()
}
