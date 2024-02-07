declare global {
    type ModuleType = 'commonjs' | 'module'

    // In package.json.
    interface PkgType {
        type?: ModuleType
    }

    // The data passed to the initialize() hook.
    interface InitializeHookData {
        self: string
        defaultModuleType: ModuleType
    }

    namespace NodeJS {
        interface Module {
            _compile(code: string, filename: string): string
        }
    }
}

declare module 'module' {
    export const _extensions: NodeJS.RequireExtensions
}

// This file needs to be a module
export { }
