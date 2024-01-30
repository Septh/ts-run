// @ts-check
import nodeExternals from 'rollup-plugin-node-externals'
import nodeResolve from '@rollup/plugin-node-resolve'
import commonsJS from '@rollup/plugin-commonjs'
import typescript from '@rollup/plugin-typescript'
import terser from '@rollup/plugin-terser'
import { defineConfig } from 'rollup'

export default defineConfig([
    {
        input: [
            'source/index.ts',
            'source/esm-hooks.ts',
            'source/cjs-hooks.ts',
        ],
        output: {
            dir: 'lib',
            format: 'esm',
            exports: 'named',
            generatedCode: 'es2015',
            sourcemap: true,
            sourcemapExcludeSources: true
        },
        plugins: [
            nodeExternals(),
            nodeResolve(),
            commonsJS({ strictRequires: true }),
            typescript()
        ],
        // Have to use Rollup's `external` option as rollup-plugin-node-externals
        // only works for dependencies, not individual source files
        external: /hooks\.js/
    },
    {
        input: 'source/cjs-transform.cts',
        output: {
            file: 'lib/cjs-transform.cjs',
            format: 'commonjs',
            exports: 'named',
            generatedCode: 'es2015',
            esModule: false,
            sourcemap: true,
            sourcemapExcludeSources: true
        },
        plugins: [
            nodeExternals(),
            nodeResolve(),
            commonsJS(),
            // Not sure why but this is the only way I've found
            // to have @rollup/plugin-typescript compile this file
            // the way I wanted.
            typescript({
                include: './source/cjs-transform.cts',
                exclude: './node-modules',
                compilerOptions: {
                    rootDir: undefined,
                    outDir: undefined,
                    module: undefined,
                },
            }),
            terser()
        ],
        // sucrase has MANY circular dependencies :/
        onLog(level, log, handler) {
            if (log.code === 'CIRCULAR_DEPENDENCY')
                return
            handler(level, log)
        }
    }
])
