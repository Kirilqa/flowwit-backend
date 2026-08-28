import { AgentEvent } from '@agent'
import { AgentDispatcherInterface } from '@agent/dispatcher'
import { SessionInterface } from '@session'
import { WorkFlowAdapter } from '@tool/implementations/adapter/WorkFlowAdapter'
import { WorkFlowRegistryInterface, WorkFlowRunnerInterface } from '@workflow'
import { CommandInterface } from '../../interfaces'
import { buildErrorEvent, splitCommandArgument } from '../../utils'

export class WorkFlowCommand implements CommandInterface {
    readonly name = 'workflow'
    readonly description =
        "Run a workflow directly with the given input, forcing the call the same way the agent's own tool calls work. Usage: <workflowId> <input>."

    constructor(
        private readonly workflowRegistry: WorkFlowRegistryInterface,
        private readonly workflowRunner: WorkFlowRunnerInterface,
        private readonly dispatcher: AgentDispatcherInterface
    ) {}

    async *execute(
        argument: string,
        rawContent: string,
        agentId: string,
        session: SessionInterface
    ): AsyncIterable<AgentEvent> {
        const { id: workflowId, rest: input } = splitCommandArgument(argument)

        if (workflowId === '') {
            yield buildErrorEvent(agentId, session.id, 'Usage: /workflow <workflowId> <input>')
            return
        }

        const workflow = this.workflowRegistry.get(workflowId)

        if (workflow === null) {
            yield buildErrorEvent(agentId, session.id, `WorkFlow "${workflowId}" not found`)
            return
        }

        yield* this.dispatcher.send(agentId, session, rawContent, {
            forcedToolCalls: [
                {
                    tool: new WorkFlowAdapter(workflow, this.workflowRunner),
                    arguments: { input },
                    bypassGuardrails: true
                }
            ]
        })
    }
}
