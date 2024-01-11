import assert from 'node:assert'
import { fileURLToPath } from 'node:url'

const self = fileURLToPath(import.meta.url)
assert.strictEqual(self, process.argv[1])
