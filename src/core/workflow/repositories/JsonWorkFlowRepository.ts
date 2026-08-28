import { mkdir, readdir, readFile, unlink, writeFile } from 'fs/promises'
import { join } from 'path'
import { getErrorMessage } from '@core/utils'
import { LoggerInterface } from '@logger'
import { WorkFlowNodeNotFoundError } from '../errors/WorkFlowNodeNotFoundError'
import { WorkFlowInterface } from '../interfaces/WorkFlowInterface'
import { WorkFlowNodeRegistryInterface } from '../interfaces/registries/WorkFlowNodeRegistryInterface'
import { WorkFlowRepositoryInterface } from '../interfaces/repositories/WorkFlowRepositoryInterface'
import { deserializeWorkFlow } from '../utils/deserializeWorkFlow'
import { serializeWorkFlow } from '../utils/serializeWorkFlow'
import { serializedWorkFlowSchema } from '../validators'

export class JsonWorkFlowRepository implements WorkFlowRepositoryInterface {
    constructor(
        private readonly directory: string,
        private readonly nodeRegistry: WorkFlowNodeRegistryInterface,
        private readonly logger: LoggerInterface
    ) {}

    async ensureInitialized(): Promise<void> {
        await mkdir(this.directory, { recursive: true })
    }

    async findAll(): Promise<Array<WorkFlowInterface>> {
        await this.ensureInitialized()

        const entries = await readdir(this.directory, { withFileTypes: true })
        const files = entries.filter(entry => entry.isFile() && entry.name.endsWith('.json'))

        const workflows = await Promise.all(files.map(file => this.loadFromFile(join(this.directory, file.name))))

        return workflows.filter((workflow): workflow is WorkFlowInterface => workflow !== null)
    }

    async findById(id: string): Promise<WorkFlowInterface | null> {
        return this.loadFromFile(this.buildFilePath(id))
    }

    async create(workflow: WorkFlowInterface): Promise<WorkFlowInterface> {
        await this.ensureInitialized()
        await writeFile(this.buildFilePath(workflow.id), JSON.stringify(serializeWorkFlow(workflow), null, 2), 'utf-8')
        return workflow
    }

    async update(id: string, workflow: WorkFlowInterface): Promise<WorkFlowInterface> {
        const existing = await this.findById(id)

        if (existing === null) {
            throw new WorkFlowNodeNotFoundError(`WorkFlow "${id}" not found`)
        }

        return this.create(workflow)
    }

    async delete(id: string): Promise<void> {
        await unlink(this.buildFilePath(id))
    }

    private async loadFromFile(filePath: string): Promise<WorkFlowInterface | null> {
        let raw: string

        try {
            raw = await readFile(filePath, 'utf-8')
        } catch {
            return null
        }

        let parsed: unknown

        try {
            parsed = JSON.parse(raw)
        } catch (error) {
            this.logger.warn('Skipping workflow file with invalid JSON', { filePath, error: getErrorMessage(error) })
            return null
        }

        const result = serializedWorkFlowSchema.safeParse(parsed)

        if (!result.success) {
            const issues = result.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`)
            this.logger.warn('Skipping invalid workflow file', { filePath, issues })
            return null
        }

        try {
            return deserializeWorkFlow(result.data, this.nodeRegistry)
        } catch (error) {
            this.logger.warn('Skipping workflow file that failed to deserialize', {
                filePath,
                error: getErrorMessage(error)
            })
            return null
        }
    }

    private buildFilePath(id: string): string {
        return join(this.directory, `${id}.json`)
    }
}
