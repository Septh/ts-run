import path from 'node:path'
import module from 'node:module'
import { fileURLToPath } from 'node:url'
import { readFileSync, statSync } from 'node:fs'
import { transform, type ModuleType } from './transform.js'

// Fields of interest in package.json.
interface PackageJson {
    type?: ModuleType
}

const pkgTypeCache = new Map<string, ModuleType | null>()
const jsExtRx = /\.([cm])?js$/
const tsExtRx = /\.([cm])?ts$/

// Determine the default module type.
// (--experimental-default-type was removed in Node 23.4.0)
let defaultModuleType: ModuleType = 'commonjs'
const [ major, minor ] = process.versions.node.split('.').map(Number)
if (major < 23 || (major === 23 && minor < 4)) {
    const argIndex = process.execArgv.findIndex(arg => arg.startsWith('--experimental-default-type'))
    if (argIndex >= 0) {
        const type = process.execArgv[argIndex].split('=')[1] || process.execArgv[argIndex + 1]
        if (type === 'module' || type === 'commonjs')
            defaultModuleType = type
    }
}

function nearestPackageType(file: string, defaultType: ModuleType): ModuleType {
    for (let current = path.dirname(file), previous = ''; previous !== current; previous = current, current = path.dirname(current)) {
        const pathKey = path.join(current, 'package.json')
        let type = pkgTypeCache.get(pathKey)
        if (type === undefined) {
            try {
                const manifest = JSON.parse(readFileSync(pathKey).toString()) as PackageJson
                type = manifest.type ?? defaultType

                // Node seems to simply ignore invalid 'type' values, so let's do the same.
                if (type !== 'commonjs' && type !== 'module')
                    type = defaultType
            }
            catch (err) {
                if (!(err instanceof Error && (err as NodeJS.ErrnoException).code === 'ENOENT'))
                    throw err
                type = null
            }

            pkgTypeCache.set(pathKey, type)
        }

        if (type !== null)
            return type
    }

    return defaultType
}

export function patchCjsLoader() {
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

    function compile(mod: module, format: ModuleType, filePath: string) {
        const buffer = readFileSync(filePath)
        const source = transform(buffer.toString(), format, path.basename(filePath))
        return mod._compile(source, filePath)
    }
}

export const resolve: module.ResolveHookSync = (specifier, context, nextResolve) => {

    // Only handle file: relative imports.
    if (/^\.{1,2}\//.test(specifier) && new URL(specifier, context.parentURL).protocol === 'file:') {
        for (const candidate of candidates(specifier)) {
            const resolved = new URL(candidate, context.parentURL)
            if (statSync(resolved, { throwIfNoEntry: false })?.isFile())
                return { url: resolved.href, shortCircuit: true }
        }
    }

    return nextResolve(specifier, context)

    function *candidates(base: string) {
        if (tsExtRx.test(base)) {
            // For .ts specifiers, only try as-is.
            yield base
        }
        else if (jsExtRx.test(base)) {
            // For .js specifiers, try the .ts counterpart first, then as-is.
            yield base.replace(jsExtRx, '.$1ts')
            yield base
        }
        else if (path.extname(base) === '' && context.conditions.includes('require')) {
            // For extension-less specifiers, mimic standard require() by trying both *.[tj]s and */index.[tj]s
            // Note that like require(), *.[cm][tj]s is not considered, only *.[tj]s
            yield base + '.ts'
            yield base + '.js'
            yield base + '/index.ts'
            yield base + '/index.js'
        }
    }
}

export const load: module.LoadHookSync = (url, context, nextLoad) => {

    // Only handle TypeScript file: URLs.
    const fileUrl = new URL(url)
    const { protocol, pathname } = fileUrl
    const ext = tsExtRx.exec(pathname)?.[0]
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
