import { access, mkdir, writeFile } from 'fs/promises'
import { dirname } from 'path'

export async function ensureJsonFileExists(filePath: string, defaultValue: unknown): Promise<void> {
    try {
        await access(filePath)
    } catch {
        await mkdir(dirname(filePath), { recursive: true })
        await writeFile(filePath, JSON.stringify(defaultValue, null, 4), 'utf-8')
    }
}
