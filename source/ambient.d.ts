declare global {
    namespace NodeJS {
        type ModuleType = 'commonjs' | 'module'

        // The data passed to the initialize() hook.
        interface InitializeHookData {
            self: string
            defaultModuleType: ModuleType
        }

        interface Module {
            _compile(code: string, filename: string): string
        }
    }

    // Fields of interest in package.json.
    interface PackageJson {
        type?: NodeJS.ModuleType
    }
}

declare module 'module' {
    export const _extensions: NodeJS.RequireExtensions
}

// This file needs to be a module
export {}
