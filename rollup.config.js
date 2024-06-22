import path from 'node:path'
import { readFile } from 'fs/promises'
import { nodeExternals } from 'rollup-plugin-node-externals'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import _commonsJS from '@rollup/plugin-commonjs'
import { sucrase } from 'rollup-plugin-fast-typescript'
import _terser from '@rollup/plugin-terser'
import { defineConfig } from 'rollup'

/** @type {import('@rollup/plugin-commonjs').default} */
const commonsJS = /** @type {any} */(_commonsJS)

/** @type {import('@rollup/plugin-terser').default} */
const terser = /** @type {any} */(_terser)

export default defineConfig([
    {
        input: [
            'source/index.ts',
            'source/esm-hooks.ts'
        ],
        output: {
            dir: 'lib',
            format: 'esm',
            generatedCode: 'es2015',
            sourcemap: true,
            sourcemapExcludeSources: true
        },
        plugins: [
            nodeExternals(),
            sucrase()
        ],
        // Have to use Rollup's external option as rollup-plugin-node-externals
        // only applies to Node builtins and npm dependencies.
        external: [ './transform.cjs' ]
    },

    // This second configuration bundles Sucrase's parser to lib/transform.cjs
    {
        input: 'source/transform.cts',
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
            commonsJS(),
            sucrase(),
            terser(),

            // This plugin fixes https://github.com/alangpierce/sucrase/issues/825
            // by replacing Sucrase's computeSourceMap.js with our own.
            {
                name: 'fix-sucrase',
                async load(id) {
                    return id.endsWith('computeSourceMap.js')
                        ? readFile(path.resolve('./source/fix-sucrase/computeSourceMap.js'), 'utf-8')
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
