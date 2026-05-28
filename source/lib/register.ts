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

    // Also install the cjs hooks if Node < 26.2
    // (the cjs loader was buggy before 26.2, and it looks like
    // https://github.com/nodejs/node/pull/62920 fixed it).
    if (major < 26 || (major === 26 && minor < 2)) {
        const { installCjsHooks } = await import('./hooks-legacy.js')
        installCjsHooks()
    }
}
else {
    module.register('./hooks-legacy.js', import.meta.url)

    const { installCjsHooks } = await import('./hooks-legacy.js')
    installCjsHooks()
}
