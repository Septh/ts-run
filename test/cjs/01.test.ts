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

    test("extension-less specifiers are supported for require()", () => {
        const foo = require('./foo')
        assert.strictEqual(foo, 'foo')
    })

    test(".ts specifiers are supported for require()", () => {
        const foo = require('./foo.ts')
        assert.strictEqual(foo, 'foo')
    })

    test(".js specifiers are supported for require()", () => {
        const foo = require('./foo.js')
        assert.strictEqual(foo, 'foo')
    })

    test("directory imports are supported when using require()", () => {
        const baz = require('./baz')
        assert.strictEqual(baz, 'baz')
    })

    test("import statements are turned into require calls", () => {
        const { qux } = globallyImportedQux as any
        assert.strictEqual(qux, 'qux')
    })

    test("export statements are turned into module.exports assignments", () => {
        const ns = require('./doe.ts')
        assert.strictEqual(ns.default, 'john')
        assert.strictEqual(ns.doe, 'doe')
    })
})
