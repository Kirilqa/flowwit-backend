import { RawAgentConfigRepositoryInterface } from '../interfaces'
import { RawAgentConfig } from '../types'
import { readFile, writeFile } from 'fs/promises'
import { LoggerInterface } from '@logger'
import { agentConfigSchema, agentConfigStoreSchema } from '../validators'

export class JsonRawAgentConfigRepository implements RawAgentConfigRepositoryInterface {
    constructor(
        private readonly filePath: string,
        private readonly logger: LoggerInterface
    ) {}

    async findAll(): Promise<Array<RawAgentConfig>> {
        return this.load()
    }

    async ensureInitialized(seed: Array<RawAgentConfig>): Promise<void> {
        const existing = await this.load()

        if (existing.length > 0) {
            return
        }

        for (const agent of seed) {
            await this.create(agent)
        }
    }

    async findById(id: string): Promise<RawAgentConfig | null> {
        const agents = await this.load()
        return agents.find(agent => agent.id === id) ?? null
    }

    async create(raw: RawAgentConfig): Promise<RawAgentConfig> {
        const agents = await this.load()
        const existingIndex = agents.findIndex(agent => agent.id === raw.id)

        if (existingIndex !== -1) {
            agents[existingIndex] = raw
        } else {
            agents.push(raw)
        }

        await this.persist(agents)
        return raw
    }

    async update(id: string, patch: Partial<RawAgentConfig>): Promise<RawAgentConfig> {
        const existing = await this.findById(id)

        if (existing === null) {
            throw new Error(`Agent config "${id}" not found`)
        }

        const updated: RawAgentConfig = { ...existing, ...patch }
        return this.create(updated)
    }

    async delete(id: string): Promise<void> {
        const agents = await this.load()
        await this.persist(agents.filter(agent => agent.id !== id))
    }

    private async load(): Promise<Array<RawAgentConfig>> {
        let raw: string

        try {
            raw = await readFile(this.filePath, 'utf-8')
        } catch {
            return []
        }

        let parsed: unknown

        try {
            parsed = JSON.parse(raw)
        } catch {
            throw new Error(`[JsonAgentConfigRepository] Failed to parse JSON file: ${this.filePath}`)
        }

        const storeResult = agentConfigStoreSchema.safeParse(parsed)

        if (!storeResult.success) {
            const issues = storeResult.error.issues
                .map(issue => `  - ${issue.path.join('.')}: ${issue.message}`)
                .join('\n')
            throw new Error(`[JsonAgentConfigRepository] Invalid config file "${this.filePath}":\n${issues}`)
        }

        const agents: Array<RawAgentConfig> = []

        for (const [index, entry] of storeResult.data.agents.entries()) {
            const result = agentConfigSchema.safeParse(entry)

            if (!result.success) {
                const issues = result.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`)
                this.logger.warn('Skipping invalid agent entry', { index, filePath: this.filePath, issues })
                continue
            }

            agents.push(result.data)
        }

        return agents
    }

    private async persist(agents: Array<RawAgentConfig>): Promise<void> {
        await writeFile(this.filePath, JSON.stringify({ agents }, null, 4), 'utf-8')
    }
}
