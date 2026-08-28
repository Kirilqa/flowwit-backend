import { z } from 'zod'
import { randomUUID } from 'crypto'
import {
    deserializeWorkFlow,
    serializeWorkFlow,
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
import { updateWorkFlowToolSchema } from './validators'

export class UpdateWorkFlowTool extends BaseWorkFlowTool<typeof updateWorkFlowToolSchema> {
    readonly name = 'workflow_update'
    readonly description =
        'Updates an existing workflow. Only provided fields are changed. Providing entries or connections replaces the entire list for that field.'
    readonly schema = updateWorkFlowToolSchema

    constructor(
        private readonly workflowRepository: WorkFlowRepositoryInterface,
        private readonly workflowRegistry: WorkFlowRegistryInterface,
        private readonly workflowNodeRegistry: WorkFlowNodeRegistryInterface
    ) {
        super()
    }

    protected async run(args: z.infer<typeof updateWorkFlowToolSchema>): Promise<WorkFlowSummary> {
        const existing = this.workflowRegistry.get(args.workflowId)

        if (existing === null) {
            throw new AgentToolError(`WorkFlow "${args.workflowId}" not found`)
        }

        const existingSerialized = serializeWorkFlow(existing)
        const newDescription = args.description ?? existing.description

        const serialized: SerializedWorkFlow = {
            id: args.workflowId,
            name: args.name ?? existing.name,
            ...(newDescription !== undefined && { description: newDescription }),
            entries: args.entries ?? existingSerialized.entries,
            connections:
                args.connections !== undefined
                    ? args.connections.map(conn => ({
                          id: conn.id ?? randomUUID(),
                          sourceNodeId: conn.sourceNodeId,
                          sourcePort: conn.sourcePort,
                          targetNodeId: conn.targetNodeId,
                          targetPort: conn.targetPort
                      }))
                    : existingSerialized.connections
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

        await this.workflowRepository.update(args.workflowId, workflow)
        this.workflowRegistry.register(args.workflowId, workflow)

        return buildWorkFlowSummary(workflow)
    }
}
