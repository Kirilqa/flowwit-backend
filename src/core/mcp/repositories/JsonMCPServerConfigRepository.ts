import { readFile, writeFile } from 'fs/promises'
import { ensureJsonFileExists } from '@core/utils'
import { MCPServerConfigRepositoryInterface } from '../interfaces'
import { MCPServerConfig } from '../types'
import { mcpServerConfigStoreSchema } from '../validators'

export class JsonMCPServerConfigRepository implements MCPServerConfigRepositoryInterface {
    constructor(private readonly filePath: string) {}

    async ensureInitialized(): Promise<void> {
        await ensureJsonFileExists(this.filePath, {})
    }

    async findAll(): Promise<Array<MCPServerConfig>> {
        const store = await this.load()

        return Array.from(store, ([name, config]) => ({ ...config, name }) as MCPServerConfig)
    }

    async findById(name: string): Promise<MCPServerConfig | null> {
        const store = await this.load()
        const config = store.get(name)

        if (!config) return null

        return { ...config, name } as MCPServerConfig
    }

    async create(config: MCPServerConfig): Promise<MCPServerConfig> {
        const store = await this.load()
        const { name, ...rest } = config
        store.set(name, rest)
        await this.persist(store)
        return config
    }

    async update(name: string, patch: Partial<MCPServerConfig>): Promise<MCPServerConfig> {
        const existing = await this.findById(name)

        if (!existing) {
            throw new Error(`MCP server config "${name}" not found`)
        }

        const updated = { ...existing, ...patch, name } as MCPServerConfig
        return this.create(updated)
    }

    async delete(name: string): Promise<void> {
        const store = await this.load()
        store.delete(name)
        await this.persist(store)
    }

    private async load(): Promise<Map<string, Omit<MCPServerConfig, 'name'>>> {
        let raw: string

        try {
            raw = await readFile(this.filePath, 'utf-8')
        } catch {
            return new Map()
        }

        let parsed: unknown

        try {
            parsed = JSON.parse(raw)
        } catch {
            throw new Error(`[JsonMCPServerConfigRepository] Failed to parse JSON file: ${this.filePath}`)
        }

        const result = mcpServerConfigStoreSchema.safeParse(parsed)

        if (!result.success) {
            const issues = result.error.issues.map(issue => `  - ${issue.path.join('.')}: ${issue.message}`).join('\n')

            throw new Error(`[JsonMCPServerConfigRepository] Invalid config file "${this.filePath}":\n${issues}`)
        }

        return new Map(Object.entries(result.data as Record<string, Omit<MCPServerConfig, 'name'>>))
    }

    private async persist(store: Map<string, Omit<MCPServerConfig, 'name'>>): Promise<void> {
        await writeFile(this.filePath, JSON.stringify(Object.fromEntries(store), null, 4), 'utf-8')
    }
}
