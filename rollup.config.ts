import path from 'node:path'
import { readFile } from 'node:fs/promises'
import { defineConfig } from 'rollup'
import { nodeExternals } from 'rollup-plugin-node-externals'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import { sucrase } from 'rollup-plugin-fast-typescript'
import { codeRaker } from 'rollup-plugin-code-raker'

/* Workaround for the wrong typings in all rollup plugins */
const { default: commonJS } = await import('@rollup/plugin-commonjs') as unknown as typeof import('@rollup/plugin-commonjs')
const { default: terser } = await import('@rollup/plugin-terser') as unknown as typeof import('@rollup/plugin-terser')

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
            codeRaker({ preset: 'application' })
        ],
        external: /\/register\.js$/
    },

    // lib/register.js, lib/hooks.js
    {
        input: [
            './source/lib/register.ts',
            './source/lib/hooks.ts'
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
            codeRaker({ preset: 'application' }),
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
        external: [ /\/hooks\.js$/, /\/transform\.js$/ ]
    },

    // lib/transform.js
    {
        input: 'source/lib/transform.ts',
        output: {
            file: 'lib/transform.js',
            format: 'esm',
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
