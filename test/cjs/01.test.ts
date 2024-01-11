import { describe, it } from 'node:test'
import assert from 'node:assert'
import path from 'node:path'
import * as globallyImportedQux from './qux.ts'

describe("A .ts script inside a { type: 'commonjs' } directory is CJS", () => {

    // cwd must be ts-run's root directory for this to work
    it("__dirname is available", () => {
        assert.strictEqual(__dirname, path.resolve('test', 'cjs'))
    })

    // cwd must be ts-run's root directory for this to work
    it("__filename is available", () => {
        assert.strictEqual(__filename, path.resolve('test', 'cjs', '01.test.ts'))
    })

    it("import statements are turned into require calls", () => {
        const { qux } = globallyImportedQux as any
        assert.strictEqual(qux, 'qux')
    })

    it("require() is available", () => {
        const foo = require('./foo.ts')
        assert.strictEqual(foo, 'foo')
    })

    it("extension-less require() specifiers are supported", () => {
        const bar = require('./bar')
        assert.strictEqual(bar, 'bar')
    })

    it("directory imports are supported when using require()", () => {
        const baz = require('./baz')
        assert.strictEqual(baz, 'baz')
    })

    //
    // This test is commented out because the Syntax Error
    // thrown by `import.meta.url` is actually not catchable
    // and will end the process no matter what :(
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
