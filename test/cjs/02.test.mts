import { describe, test } from 'node:test'
import assert from 'node:assert'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

describe("A .mts script inside a { type: 'commonjs' } directory transpiled to ESM", () => {

    test("__filename does not exist", () => {
        assert.throws(() => __filename, new ReferenceError('__filename is not defined'))
    })

    test("__dirname does not exist", () => {
        assert.throws(() => __dirname, new ReferenceError('__dirname is not defined'))
    })

    test("require does not exist", () => {
        assert.throws(() => require, new ReferenceError('require is not defined'))
    })

    test("import.meta.url is available", () => {
        assert.strictEqual(import.meta.url, pathToFileURL(path.resolve('test', 'cjs', '02.test.mts')).href)
    })
})
