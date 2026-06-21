import module from 'node:module'

const [ major, minor, patch ] = process.versions.node.split('.').map(Number)
if (!(major >= 21 || (major === 20 && minor >= 6) || (major === 18 && minor >= 19))) {
    const { name } = module.createRequire(import.meta.url)('#package.json') as typeof import('#package.json')
    throw new Error(`Unsupported Node.js version ${major}.${minor}.${patch}. ${name.split('/').pop()} requires Node.js 18.19.0+, Node.js 20.6.0+ or Node.js 21+.`)
}

process.setSourceMapsEnabled(true)

// Node.js >= 24.15, 25: use the recommended `registerHooks()` API.
// https://github.com/nodejs/node/issues/62692#issuecomment-4229736916
if (major >= 25 || (major === 24 && minor >= 15)) {
    const { resolve, load, patchCjsLoader } = await import('./hooks.js')
    module.registerHooks({ resolve, load })

    // Also monkey-patch the cjs loader if Node < 26.2
    // (https://github.com/nodejs/node/pull/62920 landed in 26.2)
    if (major < 26 || (major === 26 && minor < 2))
        patchCjsLoader()
}
else {
    // For older Node.js, use the legacy `register()` API for esm and monkey-patch the cjs loader.
    module.register('./hooks.js', import.meta.url)

    const { patchCjsLoader } = await import('./hooks.js')
    patchCjsLoader()
}
