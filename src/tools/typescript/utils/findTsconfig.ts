import fs from 'fs/promises'
import path from 'path'

const MAX_TRAVERSAL_DEPTH = 10

export const findTsconfig = async (fromFilePath: string): Promise<string | null> => {
    let dir = path.dirname(fromFilePath)

    for (let depth = 0; depth < MAX_TRAVERSAL_DEPTH; depth++) {
        const candidate = path.join(dir, 'tsconfig.json')

        try {
            await fs.access(candidate)
            return candidate
        } catch {
            const parent = path.dirname(dir)
            if (parent === dir) return null
            dir = parent
        }
    }

    return null
}
