import { createHash, randomUUID } from 'crypto'
import { mkdir, readdir, readFile, unlink, writeFile } from 'fs/promises'
import { join } from 'path'
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'
import { MemoryRepositoryInterface } from '../interfaces'
import { MEMORY_SCOPE, MemoryEntry, MemoryEntryPatch, MemoryPartition } from '../types'

const FILE_EXTENSION = '.md'
const FRONTMATTER_DELIMITER = '---'

export class FileMemoryRepository implements MemoryRepositoryInterface {
    constructor(private readonly directory: string) {}

    async ensureInitialized(): Promise<void> {
        await mkdir(this.directory, { recursive: true })
    }

    async create(partition: MemoryPartition, content: string, pinned: boolean): Promise<MemoryEntry> {
        const id = randomUUID()
        const now = Date.now()

        const entry: MemoryEntry = {
            id,
            scope: partition.scope,
            content,
            pinned,
            createdAt: now,
            updatedAt: now
        }

        await this.write(partition, entry)

        return entry
    }

    async findById(partition: MemoryPartition, id: string): Promise<MemoryEntry | null> {
        try {
            const raw = await readFile(this.resolveFilePath(partition, id), 'utf-8')
            return this.parse(partition.scope, id, raw)
        } catch {
            return null
        }
    }

    async findAll(partition: MemoryPartition): Promise<Array<MemoryEntry>> {
        let fileNames: Array<string>

        try {
            fileNames = await readdir(this.resolveDirectory(partition))
        } catch {
            return []
        }

        const entries = await Promise.all(
            fileNames
                .filter(fileName => fileName.endsWith(FILE_EXTENSION))
                .map(fileName => this.findById(partition, fileName.slice(0, -FILE_EXTENSION.length)))
        )

        return entries.filter((entry): entry is MemoryEntry => entry !== null)
    }

    async update(partition: MemoryPartition, id: string, patch: MemoryEntryPatch): Promise<MemoryEntry> {
        const existing = await this.findById(partition, id)

        if (existing === null) {
            throw new Error(`Memory entry "${id}" not found in scope "${partition.scope}"`)
        }

        const updated: MemoryEntry = {
            ...existing,
            ...(patch.content !== undefined && { content: patch.content }),
            ...(patch.pinned !== undefined && { pinned: patch.pinned }),
            updatedAt: Date.now()
        }

        await this.write(partition, updated)

        return updated
    }

    async delete(partition: MemoryPartition, id: string): Promise<void> {
        const existing = await this.findById(partition, id)

        if (existing === null) {
            throw new Error(`Memory entry "${id}" not found in scope "${partition.scope}"`)
        }

        await unlink(this.resolveFilePath(partition, id))
    }

    async search(partition: MemoryPartition, query: string): Promise<Array<MemoryEntry>> {
        const terms = query
            .toLowerCase()
            .split(/\s+/)
            .filter(term => term.length > 0)

        if (terms.length === 0) {
            return []
        }

        const entries = await this.findAll(partition)

        const scored = entries
            .map(entry => {
                const haystack = entry.content.toLowerCase()
                const score = terms.reduce((total, term) => total + (haystack.includes(term) ? 1 : 0), 0)
                return { entry, score }
            })
            .filter(({ score }) => score > 0)

        scored.sort((a, b) => b.score - a.score)

        return scored.map(({ entry }) => entry)
    }

    private resolveDirectory(partition: MemoryPartition): string {
        if (partition.scope === MEMORY_SCOPE.GLOBAL) {
            return join(this.directory, MEMORY_SCOPE.GLOBAL)
        }

        if (partition.owner === undefined) {
            throw new Error(`Memory scope "${partition.scope}" requires an owner`)
        }

        if (partition.scope === MEMORY_SCOPE.AGENT) {
            return join(this.directory, MEMORY_SCOPE.AGENT, partition.owner)
        }

        return join(this.directory, MEMORY_SCOPE.PROJECT, this.hashOwner(partition.owner))
    }

    private resolveFilePath(partition: MemoryPartition, id: string): string {
        return join(this.resolveDirectory(partition), `${id}${FILE_EXTENSION}`)
    }

    private hashOwner(owner: string): string {
        return createHash('sha256').update(owner).digest('hex')
    }

    private async write(partition: MemoryPartition, entry: MemoryEntry): Promise<void> {
        const directory = this.resolveDirectory(partition)
        await mkdir(directory, { recursive: true })
        await writeFile(join(directory, `${entry.id}${FILE_EXTENSION}`), this.serialize(entry), 'utf-8')
    }

    private parse(scope: MemoryEntry['scope'], id: string, raw: string): MemoryEntry {
        const { frontmatter, body } = this.extractFrontmatter(raw)
        const parsed = this.parseFrontmatter(frontmatter)

        const pinned = parsed['pinned'] === true
        const createdAt = typeof parsed['createdAt'] === 'number' ? parsed['createdAt'] : Date.now()
        const updatedAt = typeof parsed['updatedAt'] === 'number' ? parsed['updatedAt'] : createdAt

        return { id, scope, content: body, pinned, createdAt, updatedAt }
    }

    private extractFrontmatter(raw: string): { frontmatter: string; body: string } {
        const lines = raw.split('\n')

        if (lines[0]?.trim() !== FRONTMATTER_DELIMITER) {
            return { frontmatter: '', body: raw.trim() }
        }

        const closingIndex = lines.findIndex((line, index) => index > 0 && line.trim() === FRONTMATTER_DELIMITER)

        if (closingIndex === -1) {
            return { frontmatter: '', body: raw.trim() }
        }

        const frontmatter = lines.slice(1, closingIndex).join('\n')
        const body = lines
            .slice(closingIndex + 1)
            .join('\n')
            .trim()

        return { frontmatter, body }
    }

    private parseFrontmatter(frontmatter: string): Record<string, unknown> {
        if (!frontmatter.trim()) {
            return {}
        }

        try {
            const parsed: unknown = parseYaml(frontmatter)
            return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
                ? (parsed as Record<string, unknown>)
                : {}
        } catch {
            return {}
        }
    }

    private serialize(entry: MemoryEntry): string {
        const frontmatter = {
            pinned: entry.pinned,
            createdAt: entry.createdAt,
            updatedAt: entry.updatedAt
        }

        return `${FRONTMATTER_DELIMITER}\n${stringifyYaml(frontmatter).trim()}\n${FRONTMATTER_DELIMITER}\n\n${entry.content}\n`
    }
}
