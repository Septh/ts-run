import path from 'node:path'
import module, { type ResolveHook, type LoadHook } from 'node:module'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { nearestPackageTypeAsync, nearestPackageTypeSync } from './nearest-package-type.js'
import { transform } from './transform.cjs'

const jsExtRx = /\.([cm])?js$/
const tsExtRx = /\.([cm])?ts$/

const [ major, minor ] = process.versions.node.split('.').map(Number)

// Determine the default module type.
// Note: --experimental-default-type was removed in Node 23.4.0
let defaultModuleType: NodeJS.ModuleType = 'commonjs'
if (major < 23 || (major === 23 && minor < 4)) {
    const argIndex = process.execArgv.findIndex(arg => /^--(?:experimental-)?default-type/.test(arg))
    if (argIndex >= 0) {
        const type = process.execArgv[argIndex].split('=')[1] || process.execArgv[argIndex + 1]
        if (type === 'module' || type === 'commonjs')
            defaultModuleType = type
    }
}

export const resolve: ResolveHook = async (specifier, context, nextResolve) => {
    // Try first with the .ts extension, otherwise go as-is.
    try {
        return await nextResolve(specifier.replace(jsExtRx, '.$1ts'), context)
    }
    catch {
        return await nextResolve(specifier, context)
    }
}

export const load: LoadHook = async (url, context, nextLoad) => {
    // If this is not a TypeScript file, defer to the next hook in the chain.
    const fileUrl = new URL(url)
    const { protocol, pathname } = fileUrl
    const [ ext ] = tsExtRx.exec(pathname) ?? []
    if (protocol !== 'file:' || !ext)
        return nextLoad(url, context)

    // Determine the format based on the file's extension
    // or the nearest package.json's `type` field.
    const filePath = fileURLToPath(fileUrl)
    const format = context.format?.replace(/-typescript$/, '') ?? (
        ext === '.ts' ? await nearestPackageTypeAsync(filePath, defaultModuleType)
            : ext === '.mts' ? 'module'
            : 'commonjs'
    )

    if (format !== 'module' && format !== 'commonjs')
        return nextLoad(url, context)

    // Load and transform the file.
    const buffer = await readFile(filePath)
    const source = transform(buffer.toString(), format, path.basename(filePath))

    return {
        source,
        format,
        shortCircuit: true,
    }
}

export function installCjsHooks() {
    const { _resolveFilename } = module
    module._resolveFilename = function _resolveFilenamePatch(request, ...otherArgs) {
        try {
            // Let's try first with the .ts extension...
            return _resolveFilename.call(module, request.replace(jsExtRx, '.$1ts'), ...otherArgs)
        }
        catch {
            // Otherwise, go as-is.
            return _resolveFilename.call(module, request, ...otherArgs)
        }
    }

    module._extensions['.ts']  = (mod, filename) => compile(mod, nearestPackageTypeSync(filename, defaultModuleType), filename)
    module._extensions['.cts'] = (mod, filename) => compile(mod, 'commonjs', filename)
    module._extensions['.mts'] = (mod, filename) => compile(mod, 'module', filename)

    function compile(mod: module, format: NodeJS.ModuleType, filePath: string) {
        const buffer = readFileSync(filePath)
        const source = transform(buffer.toString(), format, path.basename(filePath))
        return mod._compile(source, filePath)
    }
}
