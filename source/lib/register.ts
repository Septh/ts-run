import module from 'node:module'

const [ major, minor, patch ] = process.versions.node.split('.').map(Number)
if (!(major >= 21 || (major === 20 && minor >= 6) || (major === 18 && minor >= 19))) {
    const { name } = module.createRequire(import.meta.url)('#package.json') as typeof import('#package.json')
    throw new Error(`Unsupported Node.js version ${major}.${minor}.${patch}. ${name.split('/').pop()} requires Node.js 18.19.0+, Node.js 20.6.0+ or Node.js 21+.`)
}

// Enable source map support.
process.setSourceMapsEnabled(true)

// Node >= 24.15, 25: register the sync hooks for both esm and cjs.
// https://github.com/nodejs/node/issues/62692#issuecomment-4229736916
if (major >= 25 || (major === 24 && minor >= 15)) {
    const { resolve, load, installCjsHooks } = await import('./hooks.js')
    module.registerHooks({ resolve, load })

    // Also install the legacy cjs hooks if Node < 26.2
    // (https://github.com/nodejs/node/pull/62920 landed in 26.2)
    if (major < 26 || (major === 26 && minor < 2))
        installCjsHooks()
}
else {
    module.register('./hooks.js', import.meta.url)

    const { installCjsHooks } = await import('./hooks.js')
    installCjsHooks()
}
