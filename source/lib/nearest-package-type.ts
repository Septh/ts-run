import path from 'node:path'
import { readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'

const pkgTypeCache = new Map<string, NodeJS.ModuleType | null>()

export function nearestPackageTypeSync(file: string, defaultType: NodeJS.ModuleType): NodeJS.ModuleType {
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


export async function nearestPackageTypeAsync(file: string, defaultModuleType: NodeJS.ModuleType): Promise<NodeJS.ModuleType> {
    for (
        let current = path.dirname(file), previous: string | undefined = undefined;
        previous !== current;
        previous = current, current = path.dirname(current)
    ) {
        const pkgFile = path.join(current, 'package.json')
        let cached = pkgTypeCache.get(pkgFile)
        if (cached === undefined) {
            cached = await readFile(pkgFile).then(
                data => {
                    const { type } = JSON.parse(data.toString()) as PackageJson
                    return (type === 'module' || type === 'commonjs') ? type : defaultModuleType
                },
                err => {
                    const { code } = err as NodeJS.ErrnoException
                    if (code !== 'ENOENT')
                        console.error(err)
                    return null
                }
            )
            pkgTypeCache.set(pkgFile, cached)
        }

        if (typeof cached === 'string')
            return cached
    }

    return defaultModuleType
}
