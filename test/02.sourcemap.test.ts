import { describe, it } from 'node:test'
import assert from 'node:assert'

// This will simply be removed by Sucrase (5 lines)
interface Unused {
    one: any
    two: any
    three: any
}

describe("SourceMap v3 support", () => {
    // Test currently disabled as it turns out that Sucrase guarantees
    // that line numbers are the same before and after transpile,
    // making the test completely irrelevant.
    // See https://github.com/alangpierce/sucrase/issues/654#issuecomment-945491876
    it.skip("correctly maps stack traces back to original TS code", () => {
        let stack = ''
        try {
            throw new Error('Stack trace should show line 19, column 19.')
        }
        catch(e) {
            stack = (e as Error).stack ?? ''
        }

        const { 1: line, 2: column } = /sourcemap.test.ts:(\d\d):(\d\d)/.exec(stack) ?? []
        assert.strictEqual(line, '15')
        assert.strictEqual(column, '19')
    })
})
