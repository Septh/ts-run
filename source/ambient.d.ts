declare global {
	namespace NodeJS {
		interface Module {
			_compile(code: string, filename: string): string
		}

		interface NodeError {
			code: string
		}

		type ModuleType = 'commonjs' | 'module'
		interface PkgType {
			type?: ModuleType
		}
	}
}

declare module 'module' {
	export const _extensions: NodeJS.RequireExtensions;
}

// This file needs to be a module
export {}
