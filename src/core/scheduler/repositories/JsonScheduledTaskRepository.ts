import { readFile, writeFile } from 'fs/promises'
import { ensureJsonFileExists } from '@core/utils'
import { ScheduledTaskRepositoryInterface } from '../interfaces'
import { ScheduledTask } from '../types'
import { scheduledTaskStoreSchema } from '../validators'

export class JsonScheduledTaskRepository implements ScheduledTaskRepositoryInterface {
    constructor(private readonly filePath: string) {}

    async ensureInitialized(): Promise<void> {
        await ensureJsonFileExists(this.filePath, { tasks: [] })
    }

    async findAll(): Promise<Array<ScheduledTask>> {
        return this.load()
    }

    async findById(id: string): Promise<ScheduledTask | null> {
        const tasks = await this.load()
        return tasks.find(task => task.id === id) ?? null
    }

    async create(task: ScheduledTask): Promise<ScheduledTask> {
        const tasks = await this.load()
        const existingIndex = tasks.findIndex(existing => existing.id === task.id)

        if (existingIndex !== -1) {
            tasks[existingIndex] = task
        } else {
            tasks.push(task)
        }

        await this.persist(tasks)
        return task
    }

    async update(id: string, patch: Partial<ScheduledTask>): Promise<ScheduledTask> {
        const existing = await this.findById(id)

        if (existing === null) {
            throw new Error(`Scheduled task "${id}" not found`)
        }

        const updated: ScheduledTask = { ...existing, ...patch }
        return this.create(updated)
    }

    async delete(id: string): Promise<void> {
        const tasks = await this.load()
        await this.persist(tasks.filter(task => task.id !== id))
    }

    private async load(): Promise<Array<ScheduledTask>> {
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
            throw new Error(`[JsonScheduledTaskRepository] Failed to parse JSON file: ${this.filePath}`)
        }

        const result = scheduledTaskStoreSchema.safeParse(parsed)

        if (!result.success) {
            const issues = result.error.issues.map(issue => `  - ${issue.path.join('.')}: ${issue.message}`).join('\n')
            throw new Error(`[JsonScheduledTaskRepository] Invalid config file "${this.filePath}":\n${issues}`)
        }

        return result.data.tasks
    }

    private async persist(tasks: Array<ScheduledTask>): Promise<void> {
        await writeFile(this.filePath, JSON.stringify({ tasks }, null, 4), 'utf-8')
    }
}
