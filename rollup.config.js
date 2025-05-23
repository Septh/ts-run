import path from 'node:path'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'rollup'
import { nodeExternals } from 'rollup-plugin-node-externals'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import { sucrase } from 'rollup-plugin-fast-typescript'

/**
 * Workaround for the wrong typings in all rollup plugins
 * (see https://github.com/rollup/plugins/issues/1541#issuecomment-1837153165)
 * @template T
 * @param {{ default: { default: T } }} module
 * @returns {T}
 */
const rollupPlugin = ({ default: plugin }) => /** @type {T} */(plugin)
const commonJS = rollupPlugin(await import('@rollup/plugin-commonjs'))
const terser = rollupPlugin(await import('@rollup/plugin-terser'))

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig([

    // bin/index.js
    {
        input: 'source/bin/index.ts',
        output: {
            file: 'bin/index.js',
            format: 'esm',
            sourcemap: true,
            sourcemapExcludeSources: true,
        },
        plugins: [
            nodeExternals(),
            sucrase()
        ],
        external: /\/register.js$/
    },

    // lib/register.js, lib/esm-hooks.js
    {
        input: [
            'source/lib/register.ts',
            'source/lib/esm-hooks.ts'
        ],
        output: {
            dir: 'lib',
            format: 'esm',
            sourcemap: true,
            sourcemapExcludeSources: true
        },
        plugins: [
            nodeExternals(),
            sucrase(),
            {
                name: 'emit-dts',
                async generateBundle() {
                    this.emitFile({
                        type: 'asset',
                        fileName: 'register.d.ts',
                        source: await readFile('./source/lib/register.d.ts')
                    })
                }
            }
        ],
        external: /\/transform.cjs$/
    },

    // lib/transform.cjs
    {
        input: 'source/lib/transform.cts',
        output: {
            file: 'lib/transform.cjs',
            format: 'commonjs',
            generatedCode: {
                preset: 'es2015',
                symbols: false
            },
            esModule: false,
            sourcemap: false,
        },
        plugins: [
            nodeExternals(),
            nodeResolve(),
            commonJS(),
            sucrase(),
            terser(),

            // This plugin fixes https://github.com/alangpierce/sucrase/issues/825
            // by replacing Sucrase's computeSourceMap.js with our own.
            {
                name: 'fix-sucrase',
                async load(id) {
                    return id.endsWith('computeSourceMap.js')
                        ? readFile(path.resolve(__dirname, './source/lib/fix-sucrase/computeSourceMap.js'), 'utf-8')
                        : null
                }
            }
        ],
        // Sucrase has MANY circular dependencies :/
        onLog(level, log, handler) {
            if (log.code === 'CIRCULAR_DEPENDENCY')
                return
            handler(level, log)
        }
    }
])
