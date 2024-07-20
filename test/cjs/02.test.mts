import { describe, test } from 'node:test'
import assert from 'node:assert'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

describe("A .mts script inside a { type: 'commonjs' } directory is ESM", () => {

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
            require('./foo.ts')
        }
        catch(e) {
            threw = e instanceof ReferenceError
        }
        assert.ok(threw)
    })

    // cwd must be ts-run's root directory for this to work
    test("import.meta.url is available", () => {
        assert.strictEqual(import.meta.url, pathToFileURL(path.resolve('test', 'cjs', '02.test.mts')).href)
    })
})
