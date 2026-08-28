import { mkdir, readdir, readFile, writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { getErrorMessage } from '@core/utils'
import { LoggerInterface } from '@logger'
import { WorkFlow } from '../implementations/workflow/WorkFlow'
import { WorkFlowRun } from '../implementations/run/WorkFlowRun'
import { WorkFlowRunInterface } from '../interfaces/WorkFlowRunInterface'
import { WorkFlowRunRepositoryInterface } from '../interfaces/repositories/WorkFlowRunRepositoryInterface'
import { WorkFlowNodeRegistryInterface } from '../interfaces/registries/WorkFlowNodeRegistryInterface'
import { SerializedWorkFlowRun } from '../types/SerializedWorkFlowRun'
import { SerializedWorkFlowRunNodeEntry } from '../types/SerializedWorkFlowRunNodeEntry'
import { MappingValue } from '../types/MappingValue'
import { WorkFlowNodeNotFoundError } from '../errors/WorkFlowNodeNotFoundError'
import { serializedWorkFlowRunSchema } from '../validators'

export class JsonWorkFlowRunRepository implements WorkFlowRunRepositoryInterface {
    constructor(
        private readonly directory: string,
        private readonly nodeRegistry: WorkFlowNodeRegistryInterface,
        private readonly logger: LoggerInterface
    ) {}

    async ensureInitialized(): Promise<void> {
        await mkdir(this.directory, { recursive: true })
    }

    async findAll(): Promise<Array<WorkFlowRunInterface>> {
        await this.ensureInitialized()

        const entries = await readdir(this.directory, { withFileTypes: true })
        const files = entries.filter(entry => entry.isFile() && entry.name.endsWith('.json'))

        const runs = await Promise.all(files.map(file => this.loadFromFile(join(this.directory, file.name))))

        return runs.filter((run): run is WorkFlowRunInterface => run !== null)
    }

    async findById(id: string): Promise<WorkFlowRunInterface | null> {
        return this.loadFromFile(this.buildFilePath(id))
    }

    async create(run: WorkFlowRunInterface): Promise<WorkFlowRunInterface> {
        await this.ensureInitialized()
        await writeFile(this.buildFilePath(run.id), JSON.stringify(this.serialize(run), null, 2), 'utf-8')
        return run
    }

    async update(id: string, run: WorkFlowRunInterface): Promise<WorkFlowRunInterface> {
        await this.ensureInitialized()
        await writeFile(this.buildFilePath(id), JSON.stringify(this.serialize(run), null, 2), 'utf-8')
        return run
    }

    async delete(id: string): Promise<void> {
        await unlink(this.buildFilePath(id))
    }

    private async loadFromFile(filePath: string): Promise<WorkFlowRunInterface | null> {
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
            this.logger.warn('Skipping workflow run file with invalid JSON', {
                filePath,
                error: getErrorMessage(error)
            })
            return null
        }

        const result = serializedWorkFlowRunSchema.safeParse(parsed)

        if (!result.success) {
            const issues = result.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`)
            this.logger.warn('Skipping invalid workflow run file', { filePath, issues })
            return null
        }

        try {
            return this.deserialize(result.data)
        } catch (error) {
            this.logger.warn('Skipping workflow run file that failed to deserialize', {
                filePath,
                error: getErrorMessage(error)
            })
            return null
        }
    }

    private serialize(run: WorkFlowRunInterface): SerializedWorkFlowRun {
        const entries: Array<SerializedWorkFlowRunNodeEntry> = run.getEntries().map(entry => {
            const configOverrides: Record<string, MappingValue> = {}

            for (const [key, value] of Object.entries(entry.configOverrides)) {
                if (value.type === 'function') continue
                configOverrides[key] = value
            }

            const portMappings: Record<string, (typeof entry.portMappings)[string]> = {}

            for (const [port, mappings] of Object.entries(entry.portMappings)) {
                const filtered = mappings.filter(mapping => mapping.value.type !== 'function')
                if (filtered.length > 0) {
                    portMappings[port] = filtered
                }
            }

            return {
                id: entry.id,
                nodeType: entry.node.type,
                portMappings,
                configOverrides,
                executions: entry.executions
            }
        })

        return {
            id: run.id,
            workflowId: run.workflowId,
            status: run.status,
            input: run.input,
            entries,
            connections: run.getConnections(),
            createdAt: run.createdAt,
            updatedAt: run.updatedAt
        }
    }

    private deserialize(serialized: SerializedWorkFlowRun): WorkFlowRunInterface {
        const tempWorkFlow = new WorkFlow(serialized.id, 'restored')

        for (const entry of serialized.entries) {
            const node = this.nodeRegistry.get(entry.nodeType)

            if (node === null) {
                throw new WorkFlowNodeNotFoundError(`Node type "${entry.nodeType}" not found in registry`)
            }

            tempWorkFlow.addNode(entry.id, node)

            for (const [port, mappings] of Object.entries(entry.portMappings)) {
                if (mappings.length > 0) {
                    tempWorkFlow.setPortMapping(entry.id, port, mappings)
                }
            }

            for (const [key, value] of Object.entries(entry.configOverrides)) {
                tempWorkFlow.setConfigOverride(entry.id, key, value)
            }
        }

        for (const connection of serialized.connections) {
            tempWorkFlow.addConnection(connection)
        }

        return new WorkFlowRun(serialized.input, tempWorkFlow, serialized)
    }

    private buildFilePath(id: string): string {
        return join(this.directory, `${id}.json`)
    }
}
