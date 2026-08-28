import { z } from 'zod'
import { WorkFlowRegistryInterface, SerializedWorkFlow, serializeWorkFlow } from '@workflow'
import { AgentToolError } from '../../errors'
import { BaseWorkFlowTool } from './bases/BaseWorkFlowTool'
import { infoWorkFlowToolSchema } from './validators'

export class InfoWorkFlowTool extends BaseWorkFlowTool<typeof infoWorkFlowToolSchema> {
    readonly name = 'workflow_info'
    readonly description =
        'Returns the full definition of a workflow including all nodes, connections, port mappings and config overrides.'
    readonly schema = infoWorkFlowToolSchema

    constructor(private readonly workflowRegistry: WorkFlowRegistryInterface) {
        super()
    }

    protected async run(args: z.infer<typeof infoWorkFlowToolSchema>): Promise<SerializedWorkFlow> {
        const workflow = this.workflowRegistry.get(args.workflowId)

        if (workflow === null) {
            throw new AgentToolError(`WorkFlow "${args.workflowId}" not found`)
        }

        return serializeWorkFlow(workflow)
    }
}
