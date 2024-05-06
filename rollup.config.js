import path from 'node:path'
import { readFile } from 'fs/promises'
import nodeExternals from 'rollup-plugin-node-externals'
import nodeResolve from '@rollup/plugin-node-resolve'
import commonsJS from '@rollup/plugin-commonjs'
import { sucrase } from 'rollup-plugin-fast-typescript'
import terser from '@rollup/plugin-terser'
import { defineConfig } from 'rollup'

export default defineConfig([
    // The main entry points are not really bundled, they're only transpiled from TS to JS.
    // We could use tsc itself for this but since we need Rollup to bundle Sucrase anyway,
    // this configuration spares us a separate build step.
    {
        input: [
            'source/index.ts',
            'source/esm-hooks.ts',
            'source/cjs-hooks.ts',
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
        external: /(?:esm|cjs)-hooks.js$/
    },

    // This second configuration bundles Sucrase's parser to lib/cjs-transform.cjs
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
            // by replacing sucrase's computeSourceMap.js with our own.
            {
                name: 'fix-sucrase',
                async load(id) {
                    return id.endsWith('computeSourceMap.js')
                        ? readFile(path.resolve('./source/fix-sucrase/computeSourceMap.js'), 'utf-8')
                        : null
                }
            }
        ],
        // sucrase has MANY circular dependencies :/
        onLog(level, log, handler) {
            if (log.code === 'CIRCULAR_DEPENDENCY')
                return
            handler(level, log)
        }
    }
])
