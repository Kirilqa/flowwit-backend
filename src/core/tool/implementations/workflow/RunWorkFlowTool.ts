import { z } from 'zod'
import {
    WorkFlowRegistryInterface,
    WorkFlowRunRepositoryInterface,
    WorkFlowRunnerInterface,
    WorkFlowRun
} from '@workflow'
import { AgentToolError } from '../../errors'
import { BaseWorkFlowTool } from './bases/BaseWorkFlowTool'
import { runWorkFlowToolSchema } from './validators'

export class RunWorkFlowTool extends BaseWorkFlowTool<typeof runWorkFlowToolSchema> {
    readonly name = 'workflow_run'
    readonly description =
        'Starts a workflow run in fire-and-forget mode and immediately returns the run ID. Use workflow_run_info to check progress and workflow_stop to abort.'
    readonly schema = runWorkFlowToolSchema

    constructor(
        private readonly workflowRegistry: WorkFlowRegistryInterface,
        private readonly workflowRunRepository: WorkFlowRunRepositoryInterface,
        private readonly workflowRunner: WorkFlowRunnerInterface
    ) {
        super()
    }

    protected async run(args: z.infer<typeof runWorkFlowToolSchema>): Promise<{ runId: string }> {
        const workflow = this.workflowRegistry.get(args.workflowId)

        if (workflow === null) {
            throw new AgentToolError(`WorkFlow "${args.workflowId}" not found`)
        }

        const run = new WorkFlowRun(args.input ?? null, workflow)

        await this.workflowRunRepository.create(run)

        void (async () => {
            for await (const _ of this.workflowRunner.run(run)) {
                void _
            }
        })().catch(() => {})

        return { runId: run.id }
    }
}
