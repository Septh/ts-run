# ts-run
> The minimalist TypeScript script runner for NodeJS.

Runs TypeScripts scripts from the command line as if they were written in plain JavaScript:

```sh
ts-run ./some-script.ts
```

See [the repo on Github](https://github.com/Septh/ts-run#readme) for full documentation.

### Features
- On-demand TypeScript transpilation so fast you won't even notice.
- Strictly follows modern Node semantics for ESM / CommonJS modules.
- Supports source maps for accurate stack traces.
- Does not spawn another process to transpile TypeScript.
- Does not spawn another Node process to run your script.
- Zero config: no config file, no command line arguments, no environment variables, no nothing.
- Does not even need a `tsconfig.json`.
- Light: only 220 kilobytes installed!
- Zero dependency!

### Non-features
- Not for running full-blown TypeScript projects.
- No REPL support.


## Licence
MIT.
