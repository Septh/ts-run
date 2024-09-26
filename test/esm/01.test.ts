import { describe, test } from 'node:test'
import assert from 'node:assert'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'

describe("A .ts script inside a { type: 'module' } directory is transpiled to ESM", () => {

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
        assert.strictEqual(import.meta.url, pathToFileURL(path.resolve('test', 'esm', '01.test.ts')).href)
    })

    test("createRequire() works", () => {
        let worked = true
        let foo: any = {}
        try {
            foo = createRequire(import.meta.url)('./foo.cts')
        }
        catch(e) {
            worked = false
        }
        assert.ok(worked)
        assert.strictEqual(foo.foo, 'foo')
    })
})
