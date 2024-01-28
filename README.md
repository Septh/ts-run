# ts-run
> The minimalist TypeScript script runner for NodeJS.

### Features
- On-demand TypeScript transpilation so fast you won't even notice.
- Strictly follows modern Node semantics for ESM / CommonJS modules.
- Supports source maps for accurate stack traces.
- Does not spawn another process to transpile TypeScript.
- Does not spawn another Node process to run your script.
- Zero config: no config file, no command line arguments, no environment variables, no nothing.
- Does not even need a `tsconfig.json` (though you may need one for *authoring* your scripts -- see below).

### Non-features
- Not for running full TypeScript projects.
- No REPL support.


## About
`ts-run` is a CLI command that you can use to run TypeScripts scripts in NodeJS as if they were written in plain JavaScript. It is a simple as:

```sh
ts-run ./some-script.ts
```

The idea is that you take advantage of your IntelliSense-compatible editor to author your scripts with full type checking on, and `ts-run` will transparently run them (using [Sucrase](https://github.com/alangpierce/sucrase) under the hood) without you having to run the TypeScript compliler beforehand.


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

and have it always available in your CLI.

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

> #### Note:
> `ts-run` is not a wrapper around Node, it *is* Node with a (tiny) preload script that transpiles TypeScript to JavaScript. Therefore, all Node command-line options and flags are available:
>
> ```sh
> ts-run --no-warnings ./some-script.ts
> ```


## TypeScript to JavaScript considerations

### ESM vs CommonJS
`ts-run`'s sole role is to transpile TypeScript code to JavaScript code, no more, no less. It does not try to convert scripts from CommonJS to ESM or vice-versa, it does not try to optimize or minify your code and it does not downlevel nor polyfill JavaScript.

So:
- when Node expects an ES module, `ts-run` essentially only removes all type annotations from TypeScript.
- when Node expects a CommonJS module, `ts-run` additionnaly transforms TypeScript's `import` statements (but not `import()` expressions!) into `require()` calls.

AND. THAT'S. ALL.

What this means in particular is, that if you try to use ESM features (i.e., things like top-level await or `import.meta.url`) in a CommonJS context, your script will crash exactly the same way a plain JavaScript script would crash in the same situation.

Conversely, CommonJS features (i.e., things like `__dirname` or `require()`) do not exist in an ESM context and `ts-run` will not make them magically available.

> If you are not familiar with CommonJS and ESM modules and when NodeJS expects one format or the other, Node's documentation has [a comprehensive guide about modules](https://nodejs.org/docs/latest-v20.x/api/esm.html).


### import specifiers
Use the `.ts`, `.mts` or `.cts` extensions when importing modules. They are mandatory in ESM modules and highly recommended in CJS modules.

```ts
import { something } from './utilities.ts'
```

Contrary to the TypeScript compiler, `ts-run` will not try and find a corresponding `.ts` file if you use a `.js` specifier.

## Authoring scripts
For the reasons stated above, `ts-run` does not need (and in fact, does not even look for) a `tsconfig.json` file.

The same is not true however for the TypeScript Language Server that your IntelliSense-aware editor relies on. You'll find the following `tsconfig.json` useful to get the right warnings and errors reports:

```jsonc
{
  "compilerOptions": {
    // This tells the TypeScript language server that this directory contains Node scripts.
    "module": "Node16",

    // Scripts must import .ts files -- ts-run does not map .js to .ts
    "allowImportingTsExtensions": true,

    // `noEmit: true` is required when using `allowImportingTsExtensions: true`
    "noEmit": true,

    // Scripts are compiled in isolation, this imposes a few restrictions
    // on some TypeScript features like const enums or namespaces.
    "isolatedModules": true,

    // Of course, add any other type-checking options you deem necessary:
    "strict": true
    // etc.
  }
}
```
For reference, you can find such a `tsconfig.json` file in the [test folder](./test/tsconfig.json).

## Debugging scripts with VS Code

Because `ts-run` supports sourcemaps, you can set breakpoints in your script code, inspect variables, etc.

Either run `ts-run` in the VS Code Javascript Debug Terminal or use the following `launch.json` configuration (replace `<path-to-your-script.ts>` with the actual path to your script):

```jsonc
{
    // Use IntelliSense to learn about possible attributes.
    // Hover to view descriptions of existing attributes.
    // For more information, visit: https://go.microsoft.com/fwlink/?linkid=830387
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Launch with ts-run",
            "request": "launch",
            "type": "node",
            "runtimeArgs": [
                "--import", "@septh/ts-run/register"
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
