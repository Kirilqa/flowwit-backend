import { z } from 'zod'
import { WorkFlowNodeRegistryInterface } from '@workflow'
import { BaseWorkFlowTool } from './bases/BaseWorkFlowTool'
import { WorkFlowNodeSummary } from './types'
import { listWorkFlowNodesToolSchema } from './validators'

export class ListWorkFlowNodesTool extends BaseWorkFlowTool<typeof listWorkFlowNodesToolSchema> {
    readonly name = 'workflow_nodes'
    readonly description =
        'Lists all available node types that can be used when building workflows. Use this to discover what node types exist and what ports, outputs and config each node expects.'
    readonly schema = listWorkFlowNodesToolSchema

    constructor(private readonly workflowNodeRegistry: WorkFlowNodeRegistryInterface) {
        super()
    }

    protected async run(_args: z.infer<typeof listWorkFlowNodesToolSchema>): Promise<Array<WorkFlowNodeSummary>> {
        return this.workflowNodeRegistry.list().map(node => ({
            type: node.type,
            isStart: node.isStart,
            ports: node.portsJsonSchema,
            outputs: node.outputsJsonSchema,
            configSchema: node.configJsonSchema
        }))
    }
}
