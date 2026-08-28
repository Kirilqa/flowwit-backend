import { tmpdir } from 'os'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { mkdir, rm } from 'fs/promises'

export function makeTempDirPath(prefix: string): string {
    return join(tmpdir(), `${prefix}-${randomUUID()}`)
}

export async function makeTempDir(prefix: string): Promise<string> {
    const dir = makeTempDirPath(prefix)
    await mkdir(dir, { recursive: true })
    return dir
}

export async function removeTempDir(dir: string): Promise<void> {
    await rm(dir, { recursive: true, force: true })
}
