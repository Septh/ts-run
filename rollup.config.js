import path from 'node:path'
import { readFile } from 'node:fs/promises'
import { defineConfig } from 'rollup'
import { nodeExternals } from 'rollup-plugin-node-externals'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonJS_ from '@rollup/plugin-commonjs'
import { sucrase } from 'rollup-plugin-fast-typescript'
import terser_ from '@rollup/plugin-terser'
import { codeRaker } from 'rollup-plugin-code-raker'

/**
 * Workaround for the wrong typings in all rollup plugins
 * (see https://github.com/rollup/plugins/issues/1541#issuecomment-1837153165)
 *
 * @template T
 * @param { {default: T} } plugin
 * @returns {T}
 */
const fixRollupPlugin = (plugin) => /** @type {T} */(plugin)
const commonJS = fixRollupPlugin(commonJS_)
const terser = fixRollupPlugin(terser_)

export default defineConfig([

    // bin/index.js
    {
        input: 'source/bin/index.ts',
        output: {
            file: 'bin/index.js',
            format: 'esm',
            sourcemap: 'hidden',
            sourcemapExcludeSources: true,
        },
        plugins: [
            nodeExternals(),
            sucrase(),
            codeRaker({ console: false })
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
            sourcemap: 'hidden',
            sourcemapExcludeSources: true
        },
        plugins: [
            nodeExternals(),
            sucrase(),
            codeRaker({ console: false }),
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
                        ? readFile(path.resolve(import.meta.dirname, './source/lib/fix-sucrase/computeSourceMap.js'), 'utf-8')
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
