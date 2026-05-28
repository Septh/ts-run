import { describe, test } from 'node:test'
import assert from 'node:assert'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

describe("A .mts script inside a { type: 'commonjs' } directory transpiled to ESM", () => {

    test("__filename does not exist", () => {
        assert.throws(() => __filename)
    })

    test("__dirname does not exist", () => {
        assert.throws(() => __dirname)
    })

    test("require does not exist", () => {
        assert.throws(() => require)
    })

    test("import.meta.url is available", () => {
        assert.strictEqual(import.meta.url, pathToFileURL(path.resolve('test', 'cjs', '02.test.mts')).href)
    })

    describe("import() .ts files", async () => {

        test("using a .ts specifier: import('./foo.ts') loads ./foo.ts", async () => {
            const { default: foo } = await import('./foo.ts')
            assert.strictEqual(foo, 'foo.ts' )
        })

        test("using a .js specifier: import('./foo.js') loads ./foo.ts", async () => {
            const { default: foo } = await import('./foo.js')
            assert.strictEqual(foo, 'foo.ts' )
        })

        test("using an extension-less specifier: import('./foo') fails", async () => {
            const specifier = './foo'
            await import(specifier).then(() => assert.fail(), (e) => assert(e.code === 'ERR_MODULE_NOT_FOUND'))
        })
    })

    describe('import() .js files', () => {

        test("with a .js specifier: import('./bar.js') loads ./bar.js", async () => {
            const { default: foo } = await import('./bar.js')
            assert.strictEqual(foo, 'bar.js')
        })

        test("with a .ts specifier: import('./bar.ts') fails", async () => {
            await import('./bar.ts').then(() => assert.fail(), (e) => assert(e.code === 'ERR_MODULE_NOT_FOUND'))
        })

        test("with an extension-less specifier: import('./bar') fails", async () => {
            const specifier = './bar'
            await import(specifier).then(() => assert.fail(), (e) => assert(e.code === 'ERR_MODULE_NOT_FOUND'))
        })
    })

    describe("import() dual .js/.ts files prioritizes the .ts file", () => {

        test("using a .ts specifier: import('./foobar.ts') ignores ./foobar.js and loads ./foobar.ts", async () => {
            const { default: foo } = await import('./foobar.ts')
            assert.strictEqual(foo, 'foobar.ts')
        })

        test("using a .js specifier: import('./foobar.js') ignores ./foobar.js and loads ./foobar.ts", async () => {
            const { default: foo } = await import('./foobar.js')
            assert.strictEqual(foo, 'foobar.ts')
        })
    })

    describe('directory import with import() always fails', () => {
        const dirs = [ './dir_js', './dir_ts' ]

        test("with dir/index.js", async () => {
            await import(dirs[0]).then(() => assert.fail(), (e) => assert(e.code === 'ERR_UNSUPPORTED_DIR_IMPORT'))
        })

        test("with dir/index.ts", async () => {
            await import(dirs[1]).then(() => assert.fail(), (e) => assert(e.code === 'ERR_UNSUPPORTED_DIR_IMPORT'))
        })
    })
})
