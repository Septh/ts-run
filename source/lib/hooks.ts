import path from 'node:path'
import module, { type ResolveHookSync, type LoadHookSync } from 'node:module'
import { fileURLToPath } from 'node:url'
import { readFileSync, statSync } from 'node:fs'
import { styleText } from 'node:util'
import { transform } from './transform.cjs'

const [ major, minor ] = process.versions.node.split('.').map(Number)
const pkgTypeCache = new Map<string, NodeJS.ModuleType | null>()
const jsExtRx = /\.([cm])?js$/
const tsExtRx = /\.([cm])?ts$/

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

function nearestPackageType(file: string, defaultType: NodeJS.ModuleType): NodeJS.ModuleType {
    for (let current = path.dirname(file), previous = ''; previous !== current; previous = current, current = path.dirname(current)) {
        const pkgFile = path.join(current, 'package.json')
        let cached = pkgTypeCache.get(pkgFile)
        if (cached === undefined) {
            try {
                const buffer = readFileSync(pkgFile)
                const { type } = JSON.parse(buffer.toString()) as PackageJson
                cached = (type === 'module' || type ==='commonjs') ? type : defaultType
            }
            catch (err) {
                const { code, message } = err as NodeJS.ErrnoException
                if (code !== 'ENOENT')
                    console.error(styleText('red', message))
                cached = null
            }

            pkgTypeCache.set(pkgFile, cached)
        }

        if (typeof cached === 'string')
            return cached
    }

    return defaultType
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

    module._extensions['.ts']  = (mod, filename) => compile(mod, nearestPackageType(filename, 'commonjs'), filename)
    module._extensions['.cts'] = (mod, filename) => compile(mod, 'commonjs', filename)
    module._extensions['.mts'] = (mod, filename) => compile(mod, 'module', filename)

    function compile(mod: module, format: NodeJS.ModuleType, filePath: string) {
        const buffer = readFileSync(filePath)
        const source = transform(buffer.toString(), format, path.basename(filePath))
        return mod._compile(source, filePath)
    }
}

export const resolve: ResolveHookSync = (specifier, context, nextResolve) => {

    // Only handle file: imports.
    if (context.parentURL && new URL(specifier, context.parentURL).protocol === 'file:') {
        for (const candidate of candidates(specifier, context.conditions)) {
            const resolved = new URL(candidate, context.parentURL)
            try {
                if (statSync(fileURLToPath(resolved)).isFile())
                    return { url: resolved.href, shortCircuit: true }
            }
            catch (err) {
                const { code } = err as NodeJS.ErrnoException
                if (code != 'ENOENT')
                    throw err
            }
        }
    }

    return nextResolve(specifier, context)

    function *candidates(base: string, conditions: string[]) {

        if (tsExtRx.test(base)) {
            // For TypeScript specifiers, only try as-is.
            yield base
        }
        else if (jsExtRx.test(base)) {
            // For JavaScript specifiers, try the TS counterpart first, then as-is.
            yield base.replace(jsExtRx, '.$1ts')
            yield base
        }
        else if (path.extname(base) === '' && conditions.includes('require')) {
            // For extension-less specifiers, mimic standard require() by trying both *.[tj]s and */index.[tj]s
            // Note that like require(), *.[cm][tj]s is not considered, only *.[tj]s
            yield base + '.ts'
            yield base + '.js'
            yield base + '/index.ts'
            yield base + '/index.js'
        }
    }
}

export const load: LoadHookSync = (url, context, nextLoad) => {

    // We only handle TypeScript files.
    const fileUrl = new URL(url)
    const { protocol, pathname } = fileUrl
    const [ ext ] = tsExtRx.exec(pathname) ?? []
    if (protocol !== 'file:' || !ext)
        return nextLoad(url, context)

    // Determine the format based on the context, the file's extension
    // or the nearest package.json's `type` field.
    const filePath = fileURLToPath(fileUrl)
    const format = context.format?.replace(/-typescript$/, '') ?? (
        ext === '.ts' ? nearestPackageType(filePath, defaultModuleType)
            : ext === '.mts' ? 'module'
            : 'commonjs'
    )

    if (format !== 'module' && format !== 'commonjs')
        return nextLoad(url, context)

    // Load and transform the file.
    const buffer = readFileSync(filePath)
    const source = transform(buffer.toString(), format, path.basename(filePath))
    return {
        source,
        format,
        shortCircuit: true,
    }
}
