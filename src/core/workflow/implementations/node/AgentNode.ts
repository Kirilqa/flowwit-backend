import { getErrorMessage } from '@core/utils'
import { AgentMessage, AgentRegistryInterface, AGENT_EVENT_TYPE } from '@agent'
import { MESSAGE_ROLE, Usage } from '@provider'
import { randomUUID } from 'crypto'
import { z } from 'zod'
import { GUARDRAIL_CHECK_MODE } from '@guardrail'
import { SessionManagerInterface } from '@session'
import { WorkFlowNodeError } from '../../errors/WorkFlowNodeError'
import { WORKFLOW_EVENT_TYPE } from '../../types/WorkFlowEventType'
import { WorkFlowNodeEvent } from '../../types/WorkFlowNodeEvent'
import { WorkFlowNodeResult } from '../../types/WorkFlowNodeResult'
import { BaseWorkFlowNode } from './bases/BaseWorkFlowNode'
import { agentNodePortsSchema, agentNodeOutputsSchema, agentNodeConfigSchema } from './validators'

export class AgentNode extends BaseWorkFlowNode<
    typeof agentNodePortsSchema,
    typeof agentNodeOutputsSchema,
    typeof agentNodeConfigSchema
> {
    readonly type = 'agent' as const
    readonly ports = agentNodePortsSchema
    readonly outputs = agentNodeOutputsSchema
    override readonly configSchema = agentNodeConfigSchema

    constructor(
        private readonly agentRegistry: AgentRegistryInterface,
        private readonly sessionManager: SessionManagerInterface
    ) {
        super()
    }

    protected async *run(
        ports: z.infer<typeof agentNodePortsSchema>,
        config: z.infer<typeof agentNodeConfigSchema>
    ): AsyncGenerator<WorkFlowNodeEvent, WorkFlowNodeResult<z.infer<typeof agentNodeOutputsSchema>>> {
        const agent = this.agentRegistry.get(config.agentId)

        if (agent === null) {
            throw new WorkFlowNodeError(`Agent "${config.agentId}" not found in registry`)
        }

        const sessionId = randomUUID()
        const session = await this.sessionManager.create(sessionId)

        try {
            if (config.messages !== undefined) {
                for (const message of config.messages) {
                    session.addMessage(message as AgentMessage)
                }
            }

            let lastMessage = ''

            const options = {
                ...(config.systemPrompt !== undefined && { systemPrompt: config.systemPrompt }),
                ...(config.outputSchema !== undefined && { outputSchema: config.outputSchema }),
                guardrailPolicy: {
                    input: config.guardrailPolicy?.input ?? GUARDRAIL_CHECK_MODE.SAFE_SKIP,
                    output: config.guardrailPolicy?.output ?? GUARDRAIL_CHECK_MODE.SAFE_SKIP,
                    toolCall: config.guardrailPolicy?.toolCall ?? GUARDRAIL_CHECK_MODE.SAFE_SKIP
                }
            }

            const agentStream = agent.run(ports.prompt, session, options)

            for await (const event of agentStream) {
                if (event.type === AGENT_EVENT_TYPE.MESSAGE) {
                    lastMessage = event.message
                }

                yield {
                    type: WORKFLOW_EVENT_TYPE.NODE_EVENT,
                    payload: event,
                    createdAt: Date.now()
                }
            }

            const messages = session.getMessages().filter(message => message.role !== MESSAGE_ROLE.SYSTEM)

            const usage: Usage = session.usage

            return {
                output: {
                    result: {
                        message: lastMessage,
                        messages,
                        usage
                    }
                }
            }
        } catch (error) {
            throw new WorkFlowNodeError(`Agent "${config.agentId}" failed: ${getErrorMessage(error)}`)
        } finally {
            await this.sessionManager.delete(sessionId)
        }
    }
}
