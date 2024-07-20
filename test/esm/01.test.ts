import { describe, test } from 'node:test'
import assert from 'node:assert'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'

describe("A .ts script inside a { type: 'module' } directory is ESM", () => {

    test("__filename does not exist", () => {
        let threw = false
        try {
            __filename
        }
        catch(e) {
            threw = e instanceof ReferenceError
        }
        assert.ok(threw)
    })

    test("__dirname does not exist", () => {
        let threw = false
        try {
            __dirname
        }
        catch(e) {
            threw = e instanceof ReferenceError
        }
        assert.ok(threw)
    })

    test("require() does not exist", () => {
        let threw = false
        try {
            require('./foo.cts')
        }
        catch(e) {
            threw = e instanceof ReferenceError
        }
        assert.ok(threw)
    })

    // cwd must be ts-run's root directory for this to work
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
