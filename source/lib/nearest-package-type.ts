import path from 'node:path'
import { readFileSync } from 'node:fs'

const pkgTypeCache = new Map<string, NodeJS.ModuleType | null>()

export function nearestPackageType(file: string, defaultType: NodeJS.ModuleType): NodeJS.ModuleType {
    for (
        let current = path.dirname(file), previous = '';
        previous !== current;
        previous = current, current = path.dirname(current)
    ) {
        const pkgFile = path.join(current, 'package.json')
        let cached = pkgTypeCache.get(pkgFile)
        if (cached === undefined) {
            try {
                const buffer = readFileSync(pkgFile)
                const { type } = JSON.parse(buffer.toString()) as PackageJson
                cached = (type === 'module' || type ==='commonjs') ? type : defaultType
            }
            catch (err) {
                const { code } = err as NodeJS.ErrnoException
                if (code !== 'ENOENT')
                    console.error(err)
                cached = null
            }

            pkgTypeCache.set(pkgFile, cached)
        }

        if (typeof cached === 'string')
            return cached
    }

    return defaultType
}
