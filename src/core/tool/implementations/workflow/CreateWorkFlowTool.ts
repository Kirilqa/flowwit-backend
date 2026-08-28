import { z } from 'zod'
import { randomUUID } from 'crypto'
import {
    deserializeWorkFlow,
    WorkFlowInterface,
    WorkFlowNodeRegistryInterface,
    WorkFlowRegistryInterface,
    WorkFlowRepositoryInterface,
    SerializedWorkFlow
} from '@workflow'
import { getErrorMessage } from '@core/utils'
import { AgentToolError } from '../../errors'
import { BaseWorkFlowTool } from './bases/BaseWorkFlowTool'
import { WorkFlowSummary } from './types'
import { buildWorkFlowSummary } from './utils'
import { createWorkFlowToolSchema } from './validators'

export class CreateWorkFlowTool extends BaseWorkFlowTool<typeof createWorkFlowToolSchema> {
    readonly name = 'workflow_create'
    readonly description =
        'Creates a new workflow from a node graph definition. Returns the generated workflow ID. Use workflow_nodes to discover available node types.'
    readonly schema = createWorkFlowToolSchema

    constructor(
        private readonly workflowRepository: WorkFlowRepositoryInterface,
        private readonly workflowRegistry: WorkFlowRegistryInterface,
        private readonly workflowNodeRegistry: WorkFlowNodeRegistryInterface
    ) {
        super()
    }

    protected async run(args: z.infer<typeof createWorkFlowToolSchema>): Promise<WorkFlowSummary> {
        const id = randomUUID()

        const serialized: SerializedWorkFlow = {
            id,
            name: args.name,
            ...(args.description !== undefined && { description: args.description }),
            entries: args.entries,
            connections: args.connections.map(conn => ({
                id: conn.id ?? randomUUID(),
                sourceNodeId: conn.sourceNodeId,
                sourcePort: conn.sourcePort,
                targetNodeId: conn.targetNodeId,
                targetPort: conn.targetPort
            }))
        }

        let workflow: WorkFlowInterface

        try {
            workflow = deserializeWorkFlow(serialized, this.workflowNodeRegistry)
        } catch (error) {
            throw new AgentToolError(getErrorMessage(error))
        }

        const validation = workflow.validate()

        if (!validation.valid) {
            throw new AgentToolError(`WorkFlow validation failed: ${validation.errors.join('; ')}`)
        }

        await this.workflowRepository.create(workflow)
        this.workflowRegistry.register(id, workflow)

        return buildWorkFlowSummary(workflow)
    }
}
