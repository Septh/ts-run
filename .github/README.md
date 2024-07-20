# ts-run
> The minimalist TypeScript script runner for NodeJS.

### Features
- On-demand TypeScript transpilation so fast you won't even notice.
- Supports source maps for accurate stack traces.
- Does not spawn another process to transpile TypeScript.
- Does not spawn another Node process to run your script.
- Strictly follows modern Node semantics for ESM and CommonJS modules.
- Zero config: no config file, no command line arguments, no environment variables, no nothing.
- Does not even need a `tsconfig.json`.
- Light: only 220 kilobytes installed!
- Zero dependency!

### Non-features
- Not for running full-blown TypeScript projects.
- No REPL support.


## About
`ts-run` is a CLI command that you can use to run TypeScript scripts in NodeJS as if they were written in plain JavaScript. It is a simple as:

```sh
ts-run ./some-script.ts
```

The idea is that you take advantage of your IntelliSense-compatible editor to author your scripts with full type checking on, and `ts-run` will transparently run them without you having to run the TypeScript compliler beforehand.


## Installation and usage
`ts-run` requires a modern (as of january 2024) version of NodeJS:
- Node 18 version 18.19.0 or later
- Node 20 version 20.6.0 or later
- Any version >= 21

#### Global install
For everyday use, you may want to install `ts-run` globally:

```sh
npm install -g @septh/ts-run
```

and have it always available in your CLI:

```sh
ts-run path/to/some/script.ts
```


#### Local install
Or you may install it locally in a project:

```sh
npm install --save-dev @septh/ts-run
```

and then call it from the `scripts` section in `package.json`:

```json
{
    "scripts": {
        "get-data": "ts-run ./scripts/download-data.ts",
        "release": "ts-run ./scripts/prepare-release.ts"
    }
}
```

or from the command line:

```sh
npx ts-run ./scripts/do-something.ts
```


## TypeScript to JavaScript considerations
`ts-run`'s sole role is to transpile TypeScript code to JavaScript code, no more, no less. It does not try to optimize or minify your code and it does not downlevel nor polyfill JavaScript. Therefore, there are a few things you should keep in mind while authoring your scripts.

### imports and exports
Beginning with `ts-run` 1.2.6, `.js` specifiers are supported to import `.ts` scripts:

```ts
// a.ts
export const something = 'great'

// b.ts
import { something } from './a.js'  // works!
```

But you may also use `.ts` specifiers:

```ts
// b.ts
import { something } from './a.ts'  // works too!
```

Whatever your choice, remember that extensions are mandatory in ESM scripts.

In short:
1. The `import ... from 'specifier'` syntax is left as is in ES modules and transformed to `const ... = require('specifier')` in CommonJS modules.
2. The `import namespace = require('specifier')` syntax is valid in ES modules only and is transformed to `const require = createRequire(); const namespace = require('specifier')`, with the [createRequire()](https://nodejs.org/api/module.html#modulecreaterequirefilename) call being hoisted if used several times.
3. Dynamics imports are always left untouched.
4. `export`s are transformed to `module.exports` assignments in CommonJS modules.
5. Type-only `import`s and `export`s, whether explicit or implicit, are recognized and silently removed.


### Path substitutions
TypeScript's module resolution specificities are not handled; instead, Node's module resolution algorithm is always used. In other words, as far as `ts-run` is concerned, it is like if both `module` and `moduleResolution` were always set to `Node16`, and `paths` was not set.

### Sucrase
`ts-run` uses a customized build of [Sucrase](https://github.com/alangpierce/sucrase) under the hood and therefore exhibits the same potential bugs and misbehaviors than Sucrase.

If `ts-run` seems to not work as you'd expect, you should first check [if this there is a Sucrase issue open for your problem](https://github.com/alangpierce/sucrase/issues). If not, please file an issue on `ts-run`.


## Authoring your scripts
As stated earlier, `ts-run` does not need (and in fact, does not even look for) a `tsconfig.json` file. The same is not true however for the TypeScript Language Server that your IntelliSense-aware editor relies on. You'll find the following `tsconfig.json` useful to get the right warnings and errors reports in your IDE:

```jsonc
{
  "compilerOptions": {
    // This tells the TypeScript language server that this directory contains Node scripts.
    "module": "Node16",

    // For scripts that use .ts import specifiers.
    // Please note that `noEmit` is required when using `allowImportingTsExtensions`
    "allowImportingTsExtensions": true,
    "noEmit": true,

    // Scripts are transpiled in isolation; this imposes a few restrictions
    // on some TypeScript features like const enums or namespaces.
    // (see https://www.typescriptlang.org/tsconfig#isolatedModules)
    "isolatedModules": true,

    // Of course, add any other type-checking options you deem necessary:
    "strict": true
    // etc.
  }
}
```

For reference, you can find such a `tsconfig.json` file in the [test folder](./test/tsconfig.json) of this repository.


## Using with a test-runner
I have tested `ts-run` with [ava](https://github.com/avajs/ava) and [Node itself](https://nodejs.org/api/test.html) and it works very well in both cases. I can see no reason why it wouldn't work with another test-runner.

### With node:test
This very repo is using Node as its test-runner of choice. Here's what your `scripts` section in `package.json` may look like:

```json
  "scripts": {
    "test": "node --import=@septh/ts-run --test test/**/*.test.{ts,mts,cts}"
  }
```

> Note: to pass command line options to Node itself, you need to use the `--import` syntax as shown above.

### With ava
Add the following entry to your `package.json`:

```json
  "ava": {
    "extensions": {
      "ts": "module",
      "mts": "module",
      "cts": "commonjs"
    },
    "nodeArguments": [
      "--import=@septh/ts-run"
    ]
  }
```

Here's an example: https://github.com/Septh/rollup-plugin-node-externals

### With other test-runners
Any test-runner that provides a mean to specify Node arguments (just like ava above) should work happily with `ts-run`.

In the worst case, you can always use the `NODE_OPTIONS` environment variable:
```sh
NODE_OPTIONS="--import=@septh/ts-run" my-test-runner
```


## Debugging scripts with VS Code
Because `ts-run` generates sourcemaps, you can set breakpoints in your script, inspect variables, etc.

Either run `ts-run` in the VS Code Javascript Debug Terminal or use the following `launch.json` configuration (replace `<path-to-your-script.ts>` with the actual path to your script):

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
            "program": "${workspaceFolder}/<path-to-your-script.ts>",
            "windows": {
                "program": "${workspaceFolder}\\<path-to-your-script.ts>"
            },
            "skipFiles": [
                "<node_internals>/**",
                "**/node_modules/**"
            ],
            "resolveSourceMapLocations": [
                "!**/node_modules/**"
            ],
        }
    ]
}
```


## Licence
MIT.
