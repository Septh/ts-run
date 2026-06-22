<p>

![NPM Version](https://img.shields.io/npm/v/@septh/ts-run?label=latest)
![Node](https://img.shields.io/node/v-lts/%40septh%2Fts-run)
![NPM Downloads](https://img.shields.io/npm/dm/@septh/ts-run)
![NPM License](https://img.shields.io/npm/l/@septh/ts-run)

</p>

# ts-run
> The minimalist TypeScript script runner for Node.js.

### Features
- **Runs scripts Node's built-in TypeScript parser won't**.
- Just-in-time TypeScript transpilation so fast you won't even notice.
- Generates source maps for accurate stack traces and easy debugging.
- Does not spawn another process to transpile TypeScript.
- Does not spawn another Node process to run your script.
- Strictly follows modern Node semantics for both ESM and CommonJS modules.
- Zero config: no config file, no command line arguments, no environment variables, no nothing.
- Does not even need a `tsconfig.json`.
- Works with test runners.
- Extra-light: only 220 kilobytes installed!
- Zero dependency!

### Non-features
- Not for running full-blown TypeScript projects.


## About
`ts-run` is a CLI command that you can use to run TypeScript scripts in Node.js as if they were written in plain JavaScript. It is as simple as:

```sh
ts-run ./some-script.ts
```

The idea is that you take advantage of your IntelliSense-compatible editor to author your scripts with full type checking on, and `ts-run` will transparently run them without you having to run the TypeScript compiler beforehand.


## Installation and usage
`ts-run` requires a modern (as of January 2024) version of Node.js:
- Node 18 version 18.19.0 or later
- Node 20 version 20.6.0 or later
- Any version >= 21

#### Global install
For everyday use, you may want to install `ts-run` globally:

```sh
npm install -g @septh/ts-run
```

so it's always available in your CLI:

```sh
ts-run path/to/some/script.ts
```


#### Local install
Or you may install it locally in a project:

```sh
# with npm
npm install --save-dev @septh/ts-run

# with pnpm
pnpm add --save-dev @septh/ts-run

# with yarn
yarn add --dev @septh/ts-run
```

and then call it from the `scripts` section in `package.json`:

```json
{
    "scripts": {
        "get-data": "ts-run ./scripts/download-data.ts",
        "release": "ts-run ./scripts/release.ts"
    }
}
```

or from the command line:

```sh
# with npx
npx ts-run ./scripts/do-something.ts

# with node --import
node --import=@septh/ts-run ./scripts/do-something.ts
```


## Differences with Node's built-in TypeScript support

Since 22.6.0, Node.js has [built-in support for running TypeScript scripts](https://nodejs.org/api/typescript.html#modules-typescript). At first, the feature had to be opted-in with the `--experimental-strip-types`, but it's been unflagged with 22.18.0 and is now always on.

However, Node only supports [erasable TypeScript syntax](https://devblogs.microsoft.com/typescript/announcing-typescript-5-8-beta/#the---erasablesyntaxonly-option): it will throw on `enum`s, `namespace`s and a few other TypeScript niceties (those used to be supported with `--experimental-transform-types` but the feature has been abandoned and [removed in 26.0.0](https://github.com/nodejs/node/pull/61803)).

So, to sum up: Node simply does not perform all the work `ts-run` does, especially transforming `enum`s and `const enum`s, parameter properties in classes, `import` statements, etc.


## TypeScript to JavaScript considerations
`ts-run`'s sole role is to transpile TypeScript code to JavaScript code, no more, no less. It does not try to optimize or minify your code and it does not downlevel nor polyfill JavaScript.

### imports and exports

`ts-run` handles `import` and `export` declarations as one would expect. The table below has all the details but it is important to note that these transforms are not 100% sound; there are a few edge cases where they could cause very subtle bugs because of the differences between esm and cjs module loading in Node.

In the vast majority of cases, though, they'll run just fine.

> [!IMPORTANT]
> Node's [`import.meta.main`](https://nodejs.org/api/esm.html#importmetamain) feature will always report `false` for scripts run through the `ts-run` executable. If you need to rely on `import.meta.main`, use the `--import` flag.

<details><summary>view table</summary>

| Statement | ESM | CJS |
|-----------|-----|-----|
| `import ... from 'specifier'` | Unchanged (1) | `const ... = require('specifier')`|
| `import namespace = require('specifier')` | `const _require = createRequire(import.meta.url); const namespace = _require('specifier')` (2) | `const namespace = require('specifier')` |
| `import('specifier')` | Unchanged | Unchanged |
| `require('specifier')` | Unchanged | Unchanged |
| `import.meta.XX` | Unchanged     | Unchanged (⚠️) |
| `export { x }` | Unchanged | `module.exports.x = x` |
| `export const x = ...`<br>`export let x = ...`<br>`export var x = ...` | Unchanged | `module.exports.x = ...` |
| `export = ...` | `module.exports = ...` (⚠️) | `module.exports = ...` |

1. Type-only `import`s and `export`s, whether explicit (with the `type` keyword) or implicit, are silently removed.
    * Note that `import type { Foo } from './bar.ts'` results in the whole statement being removed, while `import { type Foo } from './bar.ts'` is transformed to `import {} from './bar.ts'`. This is consistent with TypeScript's behavior.
2. The [`createRequire()`](https://nodejs.org/api/module.html#modulecreaterequirefilename) call is hoisted if used several times.
3. ⚠️ This will likely crash at runtime.

</details>

### Specifiers
You should simply use `.ts` specifiers everywhere:

```ts
// a.ts
export const something = 'great'
```

```ts
// b.ts
import { something } from './a.ts'
```

Beginning with 1.2.6, `.js` specifiers are also supported:

```ts
// b.ts
import { something } from './a.js'  // will import './a.ts' if it exists,
                                    // './a.js' otherwise.
```

For scripts running in a CommonJS context, extension-less specifiers can also be used:

```ts
// b.cts
import { something } from './a'   // will try './a.ts' first, then './a.js',
                                  // then './a/index.ts', then './a/index.js'
```


### TypeScript specificities
TypeScript's module resolution specificities are not handled; instead, Node's module resolution algorithm is always used.

In other words, `ts-run` always acts as if `tsconfig.json` had both `moduleResolution` and `module` set to `NodeNext` and `paths` was empty.

### Sucrase
`ts-run` uses a customized build of [Sucrase](https://github.com/alangpierce/sucrase) under the hood and therefore exhibits the same potential bugs and misbehaviors as Sucrase.

Of particular attention, the following quote from Sucrase's README:

> Decorators, private fields, throw expressions, generator arrow functions, and do expressions are all unsupported in browsers and Node (as of this writing), and Sucrase doesn't make an attempt to transpile them.

Apart from this, if `ts-run` doesn't seem to work as you'd expect, you should first check if there is a [Sucrase issue](https://github.com/alangpierce/sucrase/issues) open for your problem.


## Authoring your scripts
As stated earlier, `ts-run` does not need (and in fact, does not even look for) a `tsconfig.json` file.

The same is not true, however, for the TypeScript Language Server that your IntelliSense-aware editor relies on. You'll find the following `tsconfig.json` useful to get the right warnings and errors reports in your IDE:

```jsonc
{
  "compilerOptions": {

    // This tells TypeScript that this directory contains Node scripts.
    // "module": "bundler" would be fine, too.
    "module": "NodeNext",

    // You want to use '.ts' import specifiers.
    // Note that `noEmit` is mandatory with `allowImportingTsExtensions`.
    "allowImportingTsExtensions": true,
    "noEmit": true,

    // If you plan to compile the script with tsc at some point, comment out
    // the above two lines and either use '.js' imports or add:
    // "rewriteRelativeImportExtensions": true,

    // 'ts-run' compiles scripts in isolation.
    // (see https://www.typescriptlang.org/tsconfig#isolatedModules)
    "isolatedModules": true,

    // Of course, add any other type-checking options you deem necessary:
    "strict": true
    // etc.
  }
}
```


## Using with a test runner
I have tested `ts-run` with [ava](https://github.com/avajs/ava) and [Node itself](https://nodejs.org/api/test.html) and it works very well in both cases. I can see no reason why it wouldn't work with another test runner.

### With node:test
This very repo is using Node as its test runner of choice. Here's what your `scripts` section in `package.json` might look like:

```json
  "scripts": {
    "test": "node --import=@septh/ts-run --test test/**/*.test.{ts,mts,cts}"
  }
```

> Reminder: to pass command line options to Node itself, you need to use the `--import` syntax as shown above.

### With ava >= 8.0
Add the following entry to your `package.json`:

```json
  "ava": {
    "extensions": [ "ts", "mts", "cts" ],
    "nodeArguments": [
      "--import=@septh/ts-run"
    ]
  }
```

Here's a real-life example: https://github.com/Septh/rollup-plugin-node-externals

### With ava < 8.0
Add the following entry to your `package.json`:

```jsonc
  "ava": {
    "extensions": {
      "ts": "module",     // Or "commonjs", depending on what the `type` field says
      "mts": "module",
      "cts": "commonjs"
    },
    "nodeArguments": [
      "--import=@septh/ts-run"
    ]
  }
```


### With other test-runners
Any test runner that provides a means to specify Node arguments (just like ava above) should work happily with `ts-run`.

In the worst case, you can always use the `NODE_OPTIONS` environment variable:

```sh
NODE_OPTIONS="--import=@septh/ts-run" my-test-runner
```

>[!TIP]
> Please share your experience with other test runners in [the Discussions tab](https://github.com/Septh/ts-run/discussions) and I'll add the relevant info here.


## Debugging scripts with VS Code
`ts-run` generates sourcemaps where appropriate, making debugging scripts a breeze. You can set breakpoints, inspect variables, etc., directly in the `.ts` source file.

Either run `ts-run` in the VS Code Javascript Debug Terminal or use the following `launch.json` configuration (replace `<path/to/your/script.ts>` with the actual path to your script):

```jsonc
{
    // Use IntelliSense to learn about possible attributes.
    // Hover to view descriptions of existing attributes.
    // For more information, visit: https://go.microsoft.com/fwlink/?linkid=830387
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Run with ts-run",
            "request": "launch",
            "type": "node",
            "runtimeArgs": [
                "--import=@septh/ts-run"
            ],
            "program": "${workspaceFolder}/<path/to/your/script.ts>",
            "args": [ "--what", "ever" ],
            "skipFiles": [
                "<node_internals>/**",
                "**/node_modules/**"
            ]
        }
    ]
}
```


## License
MIT.
