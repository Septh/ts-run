<p>

![NPM Version](https://img.shields.io/npm/v/@septh/ts-run?label=latest)
![Node](https://img.shields.io/node/v-lts/%40septh%2Fts-run)
![NPM Downloads](https://img.shields.io/npm/dm/@septh/ts-run)
![NPM License](https://img.shields.io/npm/l/@septh/ts-run)

</p>

# ts-run
> The minimalist TypeScript script runner for NodeJS.

### Features
- Just-in-time TypeScript transpilation so fast you won't even notice.
- Generates source maps for accurate stack traces.
- Does not spawn another process to transpile TypeScript.
- Does not spawn another Node process to run your script.
- Strictly follows modern Node semantics for ESM and CommonJS modules.
- Zero config: no config file, no command line arguments, no environment variables, no nothing.
- Does not even need a `tsconfig.json`.
- Works with test runners.
- Extra-light: only 220 kilobytes installed!
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
        "release": "ts-run ./scripts/prepare-release.ts"
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


## Differences with Node's builtin TypeScript support

Since 22.6.0, NodeJS has [builtin support for running TypeScript scripts](https://nodejs.org/api/typescript.html#modules-typescript) through the `--experimental-strip-types` (now on by default, opt-out) and `--experimental-transform-types` (opt-in) command line flags:

```sh
node --experimental-strip-types --experimental-transform-types ./some-script.ts
```

This works quite well and the transforms are even faster than `ts-run`'s since their are done in WebAssembly through the [Amaro module](https://github.com/nodejs/amaro). However, Amaro does not perform all the work `ts-run` does, especially transforming `import`s to `require` calls in CommonJS scripts.


## TypeScript to JavaScript considerations
`ts-run`'s sole role is to transpile TypeScript code to JavaScript code, no more, no less. It does not try to optimize or minify your code and it does not downlevel nor polyfill JavaScript.

### imports and exports

`ts-run` handles `import` and `export` declarations as one would expect. In short:

* The `import ... from 'specifier'` syntax is left as is in ES modules and transformed to `const ... = require('specifier')` in CommonJS modules.
* The `import namespace = require('specifier')` syntax is valid in ES modules only and is transformed to `const require = createRequire(import.meta.url); const namespace = require('specifier')`, with the [createRequire()](https://nodejs.org/api/module.html#modulecreaterequirefilename) call being hoisted if used several times.
* Dynamics imports are always left untouched, even in CJS modules.
* Same goes for `import.meta` expressions. Yeah, even in CJS modules.
* `export`s are transformed to `module.exports` assignments in CommonJS modules.
* Type-only `import`s and `export`s, whether explicit (with the `type` keyword) or implicit, are silently removed.
  * Note that `import type { Foo } from './bar.ts'` results in the whole statement being removed, while `import { type Foo } from './bar.ts'` is transformed to `import {} from './bar.ts'`. This is consistent with TypeScript's behavior.

#### Specifiers
Given the above, you should simply import your `.ts` scripts as you would with plain Javascript:

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
import { something } from './a.js'  // works too
```

However, using .`ts` specifiers is highly recommended as a mean to ensure a smooth transition with [Node's own `--experimental-strip-types` option](https://nodejs.org/api/typescript.html#type-stripping).

#### TypeScript specificities
TypeScript's module resolution specificities are not handled; instead, Node's module resolution algorithm is always used. In other words, `ts-run` always acts as if both `moduleResolution` and `module` were set to `NodeNext` and `paths` was empty.

### Sucrase
`ts-run` uses a customized build of [Sucrase](https://github.com/alangpierce/sucrase) under the hood and therefore exhibits the same potential bugs and misbehaviors as Sucrase.

Of particular attention, the following quote from Sucrase's README:
> Decorators, private fields, throw expressions, generator arrow functions, and do expressions are all unsupported in browsers and Node (as of this writing), and Sucrase doesn't make an attempt to transpile them.

Apart from this, if `ts-run` doesn't seem to work as you'd expect, you should first check if there is a [Sucrase issue](https://github.com/alangpierce/sucrase/issues) open for your problem.


## Authoring your scripts
As stated earlier, `ts-run` does not need (and in fact, does not even look for) a `tsconfig.json` file.

The same is not true however for the TypeScript Language Server that your IntelliSense-aware editor relies on. You'll find the following `tsconfig.json` useful to get the right warnings and errors reports in your IDE:

```jsonc
{
  "compilerOptions": {

    // This tells TypeScript that this directory contains Node scripts.
    "module": "NodeNext",

    // Rewrite TypeScript file extensions in relative import paths
    // to their JavaScript equivalent in output files.
    "rewriteRelativeImportExtensions": true,

    // `rewriteRelativeImportExtensions` is a TS 5.7+ option.
    // With earlier versions of TypeScript, use the following instead:
    // "allowImportingTsExtensions": true,
    // "noEmit": true,

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

For reference, you can find such a `tsconfig.json` file in the [test](./test/tsconfig.json) directory of this repository.


## Using with a test runner
I have tested `ts-run` with [ava](https://github.com/avajs/ava) and [Node itself](https://nodejs.org/api/test.html) and it works very well in both cases. I can see no reason why it wouldn't work with another test runner.

### With node:test
This very repo is using Node as its test runner of choice. Here's what your `scripts` section in `package.json` might look like:

```json
  "scripts": {
    "test": "node --import=@septh/ts-run --test test/**/*.test.{ts,mts,cts}"
  }
```

> Note: to pass command line options to Node itself, you need to use the `--import` syntax as shown above.

### With ava
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

Here's a real-life example: https://github.com/Septh/rollup-plugin-node-externals

### With other test-runners
Any test runner that provides a mean to specify Node arguments (just like ava above) should work happily with `ts-run`.

In the worst case, you can always use the `NODE_OPTIONS` environment variable:
```sh
NODE_OPTIONS="--import=@septh/ts-run" my-test-runner
```

>[!TIP]
>
> Please share your experience with other test runners in [the Discussions tab](https://github.com/Septh/ts-run/discussions) and I'll add the relevant info here.


## Debugging scripts with VS Code
`ts-run` generates accurate sourcemaps, making debugging scripts a breeze. You can set breakpoints, inspect variables, etc.

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


## Licence
MIT.
