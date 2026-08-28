import { ToolInterface } from '../../interfaces'
import { AgentToolError } from '../../errors'
import {
    WORKFLOW_EVENT_TYPE,
    WORKFLOW_RUN_STATUS,
    WorkFlowInterface,
    WorkFlowRun,
    WorkFlowRunnerInterface
} from '@workflow'

export class WorkFlowAdapter implements ToolInterface {
    readonly name: string
    readonly description: string
    readonly parameters: Record<string, unknown>

    constructor(
        private readonly workFlow: WorkFlowInterface,
        private readonly runner: WorkFlowRunnerInterface
    ) {
        this.name = `workflow__${workFlow.id}`

        this.description =
            `WorkFlow name: "${workFlow.name}". ` +
            (workFlow.description?.trim()
                ? workFlow.description
                : `No description provided. If the user asks to run workflow "${workFlow.name}", delegate the task to it.`)

        this.parameters = {
            type: 'object',
            properties: {
                input: {
                    description:
                        'Input value passed to the workflow. Can be any type — string, object, number, or null.'
                }
            },
            required: ['input']
        }
    }

    async execute(args: Record<string, unknown>): Promise<unknown> {
        if (!('input' in args)) {
            throw new AgentToolError(`WorkFlow "${this.workFlow.name}": "input" argument is required`)
        }

        const run = new WorkFlowRun(args['input'], this.workFlow)

        let failureReason: string | undefined

        for await (const event of this.runner.run(run)) {
            if (event.type === WORKFLOW_EVENT_TYPE.RUN_FAILED) {
                failureReason = event.error
            }
        }

        if (run.status === WORKFLOW_RUN_STATUS.FAILED) {
            throw new AgentToolError(
                `WorkFlow "${this.workFlow.name}" failed${failureReason !== undefined ? `: ${failureReason}` : ''}`
            )
        }

        return run.getOutput()
    }
}
