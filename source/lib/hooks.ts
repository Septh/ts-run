import path from 'node:path'
import module from 'node:module'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
import { nearestPackageTypeSync } from './nearest-package-type.js'
import { transform } from './transform.cjs'

const jsExtRx = /\.([cm])?js$/
const tsExtRx = /\.([cm])?ts$/

const defaultModuleType: NodeJS.ModuleType = 'commonjs'

export const hooks: module.RegisterHooksOptions = {
    resolve(specifier, context, nextResolve) {

        // First, try as-is. This will resolve node builtins, npm modules
        // and even maybe the specifier.
        let error: unknown
        try {
            return nextResolve(specifier, context)
        }
        catch (e) {
            error = e
        }

        if (new URL(specifier, context.parentURL).protocol === 'file:') {
            for (const candidate of candidates(specifier, context.conditions)) {
                try {
                    return nextResolve(candidate, context)
                }
                catch {}
            }
        }

        // Nothing worked, re-throw the initial error.
        throw error

        function *candidates(base: string, conditions: string[]) {

            // Always try *.[cm]js => *.[cm]ts
            if (jsExtRx.test(base))
                yield base.replace(jsExtRx, '.$1ts')

            // Mimic standard require() for extension-less specifier by trying both *.ts and */index.ts
            if (path.extname(base) === '' && conditions.includes('require')) {
                yield base + '.ts'
                yield base + '/index.ts'
            }
        }
    },

    load(url, context, nextLoad) {

        // If this is not a TypeScript file, defer to the next hook in the chain.
        const fileUrl = new URL(url)
        const { protocol, pathname } = fileUrl
        const [ ext ] = tsExtRx.exec(pathname) ?? []
        if (protocol !== 'file:' || !ext)
            return nextLoad(url, context)

        // Determine the format based on the passed format, the file's extension
        // or the nearest package.json's `type` field.
        const filePath = fileURLToPath(fileUrl)
        const format = (context.format ?? (
            ext === '.ts'
                ? nearestPackageTypeSync(filePath, defaultModuleType)
                : ext === '.mts'
                    ? 'module'
                    : 'commonjs'
        )).replace(/-typescript$/, '')

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
}
