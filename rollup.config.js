import path from 'node:path'
import { readFile } from 'fs/promises'
import { createRequire } from 'node:module'
import { nodeExternals } from 'rollup-plugin-node-externals'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import _commonsJs from '@rollup/plugin-commonjs'
import _replace from '@rollup/plugin-replace'
import { sucrase } from 'rollup-plugin-fast-typescript'
import _terser from '@rollup/plugin-terser'
import { defineConfig } from 'rollup'

/**
 * @template T
 * @param {{ default: T }} f
 * @see {@link https://github.com/rollup/plugins/issues/1541#issuecomment-1837153165}
 */
const fix = (f) => /** @type {T} */(f)
const commonJs = fix(_commonsJs)
const replace = fix(_replace)
const terser = fix(_terser)

/** @type {import('#package.json')} */
const { name, version } = createRequire(import.meta.url)('#package.json')

/** @type {import('@rollup/plugin-replace').RollupReplaceOptions} */
const replacements = {
    include: [ '**/index.js', '**/register.js' ],
    preventAssignment: true,
    sourceMap: true,
    delimiters: [ '', '' ],
    values: {
        __TSRUN_NAME__: name.split('/')[1],
        __TSRUN_VERSION__: version
    }
}

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
            sucrase(),
            replace(replacements)
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
            replace(replacements),
            {
                name: 'emit-dst',
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
            commonJs(),
            sucrase(),
            terser(),

            // This plugin fixes https://github.com/alangpierce/sucrase/issues/825
            // by replacing Sucrase's computeSourceMap.js with our own.
            {
                name: 'fix-sucrase',
                async load(id) {
                    return id.endsWith('computeSourceMap.js')
                        ? readFile(path.resolve('./source/lib/fix-sucrase/computeSourceMap.js'), 'utf-8')
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
