import { mkdir, readdir, readFile, writeFile, unlink, rm } from 'fs/promises'
import { join } from 'path'
import { ScheduledTaskRunRepositoryInterface } from '../interfaces'
import { ScheduledTaskRun } from '../types'

export class JsonScheduledTaskRunRepository implements ScheduledTaskRunRepositoryInterface {
    private readonly taskIdByRunId = new Map<string, string>()

    constructor(private readonly directory: string) {}

    async ensureInitialized(): Promise<void> {
        await mkdir(this.directory, { recursive: true })
    }

    async findAll(): Promise<Array<ScheduledTaskRun>> {
        await this.ensureInitialized()

        const entries = await readdir(this.directory, { withFileTypes: true })
        const taskDirectories = entries.filter(entry => entry.isDirectory())

        const runsByTask = await Promise.all(taskDirectories.map(entry => this.loadTaskDirectory(entry.name)))

        return runsByTask.flat()
    }

    async findById(id: string): Promise<ScheduledTaskRun | null> {
        const cachedTaskId = this.taskIdByRunId.get(id)

        if (cachedTaskId !== undefined) {
            return this.loadFromFile(cachedTaskId, id)
        }

        const runs = await this.findAll()
        return runs.find(run => run.id === id) ?? null
    }

    async findByTaskId(taskId: string): Promise<Array<ScheduledTaskRun>> {
        return this.loadTaskDirectory(taskId)
    }

    async create(run: ScheduledTaskRun): Promise<ScheduledTaskRun> {
        await mkdir(this.buildTaskDirectory(run.taskId), { recursive: true })
        await writeFile(this.buildFilePath(run.taskId, run.id), JSON.stringify(run, null, 2), 'utf-8')

        this.taskIdByRunId.set(run.id, run.taskId)
        return run
    }

    async update(id: string, patch: Partial<ScheduledTaskRun>): Promise<ScheduledTaskRun> {
        const existing = await this.findById(id)

        if (existing === null) {
            throw new Error(`Scheduled task run "${id}" not found`)
        }

        const updated: ScheduledTaskRun = { ...existing, ...patch }
        return this.create(updated)
    }

    async delete(id: string): Promise<void> {
        const taskId = this.taskIdByRunId.get(id) ?? (await this.findById(id))?.taskId

        if (taskId === undefined) return

        await unlink(this.buildFilePath(taskId, id)).catch(() => {})
        this.taskIdByRunId.delete(id)
    }

    async deleteByTaskId(taskId: string): Promise<void> {
        await rm(this.buildTaskDirectory(taskId), { recursive: true, force: true })

        for (const [runId, cachedTaskId] of this.taskIdByRunId) {
            if (cachedTaskId === taskId) this.taskIdByRunId.delete(runId)
        }
    }

    async pruneOldest(taskId: string, keep: number): Promise<void> {
        const runs = await this.loadTaskDirectory(taskId)

        if (runs.length <= keep) return

        const excess = [...runs].sort((a, b) => b.startedAt - a.startedAt).slice(keep)

        for (const run of excess) {
            await unlink(this.buildFilePath(taskId, run.id)).catch(() => {})
            this.taskIdByRunId.delete(run.id)
        }
    }

    private async loadTaskDirectory(taskId: string): Promise<Array<ScheduledTaskRun>> {
        const directory = this.buildTaskDirectory(taskId)

        let files: Array<string>
        try {
            files = (await readdir(directory)).filter(name => name.endsWith('.json'))
        } catch {
            return []
        }

        const runs = await Promise.all(files.map(file => this.loadFromFile(taskId, file.replace(/\.json$/, ''))))

        return runs.filter((run): run is ScheduledTaskRun => run !== null)
    }

    private async loadFromFile(taskId: string, runId: string): Promise<ScheduledTaskRun | null> {
        try {
            const raw = await readFile(this.buildFilePath(taskId, runId), 'utf-8')
            const run = JSON.parse(raw) as ScheduledTaskRun

            this.taskIdByRunId.set(runId, taskId)
            return run
        } catch {
            return null
        }
    }

    private buildTaskDirectory(taskId: string): string {
        return join(this.directory, taskId)
    }

    private buildFilePath(taskId: string, runId: string): string {
        return join(this.buildTaskDirectory(taskId), `${runId}.json`)
    }
}
