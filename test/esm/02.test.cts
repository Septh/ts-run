import { describe, test } from 'node:test'
import assert from 'node:assert'
import path from 'node:path'

describe("A .cts script inside a { type: 'module' } directory is transpiled to CJS", () => {

    // cwd must be ts-run's root directory for this to work
    test("__filename is available", () => {
        assert.strictEqual(__filename, path.resolve('test', 'esm', '02.test.cts'))
    })

    // cwd must be ts-run's root directory for this to work
    test("__dirname is available", () => {
        assert.strictEqual(__dirname, path.resolve('test', 'esm'))
    })

    test("require() is available", () => {
        const { foo } = require('./foo.cts')
        assert.strictEqual(foo, 'foo')
    })
})
