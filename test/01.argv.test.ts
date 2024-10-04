import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import child_process from 'node:child_process'
import { promisify } from 'node:util'

const execFile = promisify(child_process.execFile)

describe("argv handling", () => {

    const tsRunCLI = './bin/index.js'
    const script = './test/esm/args.ts'
    const args = [ 'arg1', 'arg2', 'arg3' ]

    const nodePath = process.argv[0]
    const scriptPath = path.resolve(script)

    test("Correctly updates `process.argv` when run as CLI", async () => {
        const { stdout } = await execFile('node', [ tsRunCLI, script, ...args ])
        assert.deepStrictEqual(stdout.trim().split('\n'), [
            nodePath,
            scriptPath,
            ...args
        ])
    })
})
