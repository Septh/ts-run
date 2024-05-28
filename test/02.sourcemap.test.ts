import { describe, test } from 'node:test'
import assert from 'node:assert/strict'

// This will simply be removed by Sucrase (5 lines)
export interface Unused {
    one: any
    two: any
    three: any
}

describe("SourceMap v3 support", () => {
    // It turns out that Sucrase guarantees that line numbers are the same before and after transpile
    // (see https://github.com/alangpierce/sucrase/issues/654#issuecomment-945491876),
    // making this test mostly irrelevant.
    test("correctly maps stack traces back to original TS code", () => {
        let stack = ''
        try {
            // Additional spaces are intentional. column in on the `new` statement.
            throw   new Error('Stack trace should show line 19, column 21.')
        }
        catch(e) {
            stack = (e as Error).stack ?? ''
        }

        const { 1: line, 2: column } = /sourcemap.test.ts:(\d\d):(\d\d)/.exec(stack) ?? []
        assert.deepEqual({ line: '19', column: '21' }, { line, column })
    })
})
