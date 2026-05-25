import path from 'node:path'
import module from 'node:module'
import { fileURLToPath } from 'node:url'
import { readFileSync, statSync } from 'node:fs'
import { nearestPackageTypeSync } from './nearest-package-type.js'
import { transform } from './transform.cjs'

const jsExtRx = /\.([cm])?js$/
const tsExtRx = /\.([cm])?ts$/

export const hooks: module.RegisterHooksOptions = {
    resolve(specifier, context, nextResolve) {

        if (context.parentURL && new URL(specifier, context.parentURL).protocol === 'file:') {
            for (const candidate of candidates(specifier, context.conditions)) {
                const resolved = new URL(candidate, context.parentURL)
                try {
                    const stat = statSync(fileURLToPath(resolved))
                    if (stat.isFile())
                        return { url: resolved.href, shortCircuit: true }
                }
                catch (e: any) {
                    if (e.code != 'ENOENT')
                        throw e
                }
            }
        }

        // Not found, defer to the next hook in the chain.
        return nextResolve(specifier, context)

        function *candidates(base: string, conditions: string[]) {

            if (jsExtRx.test(base)) {
                // For *.[cm]js specifiers, always try *.[cm]ts first.
                yield base.replace(jsExtRx, '.$1ts')
                yield base
            }
            else if (tsExtRx.test(base)) {
                // For *.[cm]ts specifiers, always try as-is first, then *.[cm]js.
                yield base
                yield base.replace(tsExtRx, '.$1js')
            }
            else if (path.extname(base) === '' && conditions.includes('require')) {
                // Otherwise, mimic standard require() for extension-less specifier by trying both *.[ts]s and */index.[tj]s
                // Note that like require(), *.[cm][tj]s is not tried, only *.[tj]s
                yield base + '.ts'
                yield base + '.js'
                yield base + '/index.ts'
                yield base + '/index.js'
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
                ? nearestPackageTypeSync(filePath, 'commonjs')
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
