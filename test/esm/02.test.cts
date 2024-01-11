import { describe, it } from 'node:test'
import assert from 'node:assert'
import path from 'node:path'

describe("A .cts script inside a { type: 'module' } directory is CJS", () => {

    // cwd must be ts-run's root directory for this to work
    it("__dirname is available", () => {
        assert.strictEqual(__dirname, path.resolve('test', 'esm'))
    })

    // cwd must be ts-run's root directory for this to work
    it("__filename is available", () => {
        assert.strictEqual(__filename, path.resolve('test', 'esm', '02.test.cts'))
    })

    it("require() is available", () => {
        const foo = require('./foo.cts')
        assert.strictEqual(foo, 'foo')

        // const bar = require('./bar.cts')
        // assert.strictEqual(bar, 'bar')
    })

    //
    // This test is commented out because the Syntax Error
    // thrown by `import.meta.url` is actually not catchable :(
    //
    /* it('throws on import.meta.url', () => {
        let threw = false
        try {
            // @ts-expect-error ts(1470): The 'import.meta' meta-property is not allowed in files which will build into CommonJS output.
            console.log(import.meta.url)
        }
        catch {
            threw = true
        }

        assert(threw)
    }) */
})
