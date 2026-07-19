declare global {
    namespace NodeJS {
        interface Module {
            _compile(code: string, filename: string): string
        }
    }
}

declare module 'node:module' {
    export function _resolveFilename(request: string, ...otherArgs: any[]): string
    export const _extensions: NodeJS.RequireExtensions
}

// This file needs to be a module
export {}
