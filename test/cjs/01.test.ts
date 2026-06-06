import { describe, test } from 'node:test'
import assert from 'node:assert'
import path from 'node:path'
import * as globallyImportedQux from './qux.ts'

describe("A .ts script inside a { type: 'commonjs' } directory is transpiled to CJS", () => {

    test("__filename is available", () => {
        assert.strictEqual(__filename, path.resolve('test', 'cjs', '01.test.ts'))
    })

    test("__dirname is available", () => {
        assert.strictEqual(__dirname, path.resolve('test', 'cjs'))
    })

    test("require() is available", () => {
        assert(typeof require === 'function')
        assert(typeof require.resolve === 'function')
    })

    describe("require() .ts files", () => {

        test("using a .ts specifier: require('./foo.ts') loads ./foo.ts", () => {
            assert.strictEqual(require('./foo.ts'), 'foo.ts')
        })

        test("using a .js specifier: require('./foo.js') loads ./foo.ts", () => {
            assert.strictEqual(require('./foo.js'), 'foo.ts')
        })

        test("using an extension-less specifier: require('./foo') loads ./foo.ts", () => {
            assert.strictEqual(require('./foo'), 'foo.ts')
        })
    })

    describe('require() .js files', () => {

        test("with a .js specifier: require('./bar.js') loads ./bar.js", () => {
            assert.strictEqual(require('./bar.js'), 'bar.js')
        })

        test("with a .ts specifier: require('./bar.ts') fails", () => {
            assert.throws(() => {
                require('./bar.ts')
            })
        })

        test("with an extension-less specifier: require('./bar') loads ./bar.js", () => {
            const foo = require('./bar')
            assert.strictEqual(foo, 'bar.js')
        })
    })

    describe("require() dual .js/.ts files prioritizes the .ts file", () => {

        test("using a .ts specifier: require('./foobar.ts') ignores ./foobar.js and loads ./foobar.ts", () => {
            assert.strictEqual(require('./foobar.ts'), 'foobar.ts')
        })

        test("using a .js specifier: require('./foobar.js') ignores ./foobar.js and loads ./foobar.ts", () => {
            assert.strictEqual(require('./foobar.js'), 'foobar.ts')
        })

        test("using an extension-less specifier: require('./foobar') ignores ./foobar.js and loads ./foobar.ts", () => {
            assert.strictEqual(require('./foobar'), 'foobar.ts')
        })
    })

    describe('directory import with require()', () => {

        test("with dir/index.js", () => {
            assert.strictEqual(require('./dir_js'), 'dir_js/index.js')
        })

        test("with dir/index.ts", () => {
            assert.strictEqual(require('./dir_ts'), 'dir_ts/index.ts')
        })
    })

    test("import statements are turned into require calls", () => {
        const { qux } = globallyImportedQux as any
        assert.strictEqual(qux, 'qux.ts')
    })

    test("export statements are turned into module.exports assignments", () => {
        const ns = require('./doe.ts')
        assert.strictEqual(ns.default, 'john')
        assert.strictEqual(ns.doe, 'doe')
    })
})
