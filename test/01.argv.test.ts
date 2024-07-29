import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'

const isImported = process.execArgv.find(arg => arg.startsWith('--import'))
const self = fileURLToPath(import.meta.url)

describe("argv handling", () => {
    test((isImported
        ? "Doesn't patch `process.argv` when --import'ed"
        : "Correctly patches `process.argv` when run as entry point"
    ), () => {
        assert.strictEqual(self, process.argv[1])
    })
})
