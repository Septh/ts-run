# ts-run
> The minimalist TypeScript script runner for NodeJS.

Run TypeScript scripts from the command line as if they were plain JavaScript.

```sh
ts-run path/to/script.ts
```

See [the repo on Github](https://github.com/Septh/ts-run#readme) for full documentation.


### Features
- Just-in-time TypeScript transpilation so fast you won't even notice.
- Generates source maps for accurate stack traces.
- Does not spawn another process to transpile TypeScript.
- Does not spawn another Node process to run your script.
- Strictly follows modern Node semantics for ESM and CommonJS modules.
- Zero config: no config file, no command line arguments, no environment variables, no nothing.
- Does not even need a `tsconfig.json`.
- Extra-light: only 220 kilobytes installed!
- Zero dependency!

### Non-features
- Not for running full-blown TypeScript projects.
- No REPL support.


## Licence
MIT.
