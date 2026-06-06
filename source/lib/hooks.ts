import path from 'node:path'
import type { RegisterHooksOptions } from 'node:module'
import { fileURLToPath } from 'node:url'
import { readFileSync, statSync } from 'node:fs'
import { nearestPackageType } from './nearest-package-type.js'
import { transform } from './transform.cjs'

const jsExtRx = /\.([cm])?js$/
const tsExtRx = /\.([cm])?ts$/

export const hooks: RegisterHooksOptions = {
    resolve(specifier, context, nextResolve) {

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

        // Not found, defer to the next hook in the chain.
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
        const format = context.format?.replace(/-typescript$/, '') ?? (
            ext === '.ts' ? nearestPackageType(filePath, 'commonjs')
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
}
