declare global {

    namespace NodeJS {
        type ModuleType = 'commonjs' | 'module'

        interface Module {
            _resolveFilename(request: string, ...otherArgs: any[]): string
            _compile(code: string, filename: string): string
        }
    }

    // Fields of interest in package.json.
    interface PackageJson {
        type?: NodeJS.ModuleType
    }

    // The data passed to the initialize() hook.
    interface HookData {
        self: string
        defaultModuleType: NodeJS.ModuleType
    }
}

declare module 'module' {
    export function _resolveFilename(request: string, ...otherArgs: any[]): string
    export const _extensions: NodeJS.RequireExtensions
}

// This file needs to be a module
export {}
