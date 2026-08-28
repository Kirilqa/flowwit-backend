import { z } from 'zod'
import { WorkFlowRunnerInterface } from '@workflow'
import { AgentToolError } from '../../errors'
import { BaseWorkFlowTool } from './bases/BaseWorkFlowTool'
import { stopWorkFlowRunToolSchema } from './validators'

export class StopWorkFlowRunTool extends BaseWorkFlowTool<typeof stopWorkFlowRunToolSchema> {
    readonly name = 'workflow_stop'
    readonly description = 'Stops a running workflow run. Has no effect if the run is already completed or failed.'
    readonly schema = stopWorkFlowRunToolSchema

    constructor(private readonly workflowRunner: WorkFlowRunnerInterface) {
        super()
    }

    protected async run(args: z.infer<typeof stopWorkFlowRunToolSchema>): Promise<{ runId: string }> {
        try {
            await this.workflowRunner.stop(args.runId)
        } catch (error) {
            throw new AgentToolError(error instanceof Error ? error.message : String(error))
        }

        return { runId: args.runId }
    }
}
