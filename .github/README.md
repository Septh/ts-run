# ts-run
> The minimalist TypeScript script runner for NodeJS.

### Features
- On-demand TypeScript transpilation so fast you won't even notice.
- Supports source maps for accurate stack traces.
- Does not spawn another process to transpile TypeScript.
- Does not spawn another Node process to run your script.
- Strictly follows modern Node semantics for ESM / CommonJS modules.
- Zero config: no config file, no command line arguments, no environment variables, no nothing.
- Does not even need a `tsconfig.json` (though you may need one for *authoring* your scripts -- keep reading below).
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

### import specifiers
Use the `.ts`, `.mts` or `.cts` extensions when importing modules. They are mandatory in ESM modules and highly recommended in CJS modules.

```ts
import { something } from './utilities.ts'
```

Contrary to the TypeScript compiler, `ts-run` will *not* try and find a corresponding `.ts` file if you use a `.js` specifier. See the [authoring section](#authoring-your-scripts) for details on how to enable `.ts` extension imports.

### Type-only imports and exports
I find it generally better to be explicit about type-only imports and exports by using TypeScript's `import type ...`, `import { type ...}` and `export type ...` syntax.

However, because not everyone is willing to type the extra characters, `ts-run` version 1.2.3 and later will transparently ignore type-only imports and exports.

### Path substitutions
TypeScript's module resolution specificities are not handled. As far as `ts-run` is concerned, it is like if `moduleResolution` was always set to `Node16`.


## Authoring your scripts
As stated above, `ts-run` does not need (and in fact, does not even look for) a `tsconfig.json` file. The same is not true however for the TypeScript Language Server that your IntelliSense-aware editor relies on. You'll find the following `tsconfig.json` useful to get the right warnings and errors reports in your IDE:

```jsonc
{
  "compilerOptions": {
    // This tells the TypeScript language server that this directory contains Node scripts.
    "module": "Node16",

    // - Scripts must import .ts files as ts-run does not map .js to .ts
    // - `noEmit` is required when using `allowImportingTsExtensions`
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
This very repo is using Node as its test-runner of choice -- see the `scripts` section in `package.json`:

```json
  "scripts": {
    "test": "ts-run test/check-node-21.ts && node --import=@septh/ts-run/register --test test/**/*.test.{ts,mts,cts}"
  }
```

> Note: to pass command line options to Node itself, you need to use the `--import` syntax as shown above.

The only caveat here is that Node started to support glob patterns as arguments to the `--test` option only since version 21, hence the little script that checks the version of Node before running the tests. This is a limitation of Node, not `ts-run`.

On the other hand, this works with older versions of Node supported by `ts-run`:
```json
  "scripts": {
    "test": "node --import=@septh/ts-run/register --test my-test-script.ts"
}
```

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
      "--import=@septh/ts-run/register"
    ]
  }
```

Here's an example: https://github.com/Septh/rollup-plugin-node-externals

### With other test-runners
Any test-runner that provides a mean to specify Node arguments (just like ava above) should work happily with `ts-run`.

In the worst case, you can always use the `NODE_OPTIONS` environment variable:
```sh
NODE_OPTIONS="--import=@septh/ts-run/register" my-test-runner
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
                "--import=@septh/ts-run/register"
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
