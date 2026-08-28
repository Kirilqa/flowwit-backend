import { z } from 'zod'
import { WorkFlowRegistryInterface } from '@workflow'
import { BaseWorkFlowTool } from './bases/BaseWorkFlowTool'
import { WorkFlowSummary } from './types'
import { buildWorkFlowSummary } from './utils'
import { listWorkFlowsToolSchema } from './validators'

export class ListWorkFlowsTool extends BaseWorkFlowTool<typeof listWorkFlowsToolSchema> {
    readonly name = 'workflow_list'
    readonly description = 'Lists all available workflows in the system with their basic information.'
    readonly schema = listWorkFlowsToolSchema

    constructor(private readonly workflowRegistry: WorkFlowRegistryInterface) {
        super()
    }

    protected async run(_args: z.infer<typeof listWorkFlowsToolSchema>): Promise<Array<WorkFlowSummary>> {
        return this.workflowRegistry.list().map(buildWorkFlowSummary)
    }
}
