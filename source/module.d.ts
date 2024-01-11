declare global {
	namespace NodeJS {
		interface Module {
			_compile(code: string, filename: string): string
		}
	}
}

declare module 'module' {
	export const _extensions: NodeJS.RequireExtensions;
}

// This file needs to be a module
export {}
