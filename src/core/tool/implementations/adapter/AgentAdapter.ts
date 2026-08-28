import { randomUUID } from 'crypto'
import { GUARDRAIL_CHECK_MODE } from '@guardrail'
import { AgentInterface, AGENT_EVENT_TYPE, AgentRunOptions } from '@agent'
import { SessionManagerInterface } from '@session'
import { AgentToolError } from '../../errors'
import { ToolInterface } from '../../interfaces'

export class AgentAdapter implements ToolInterface {
    readonly name: string
    readonly description: string
    readonly parameters: Record<string, unknown>

    constructor(
        private readonly agent: AgentInterface,
        private readonly sessionManager: SessionManagerInterface
    ) {
        this.name = `agent__${agent.config.name}`

        this.description =
            `Agent name: "${agent.config.name}". ` +
            (agent.config.description?.trim()
                ? agent.config.description
                : `No description provided. If the user asks to run agent "${agent.config.name}", delegate the task to it.`)

        this.parameters = {
            type: 'object',
            properties: {
                task: {
                    type: 'string',
                    description:
                        'A clear, self-contained task description. The sub-agent has no context from the current conversation — include everything it needs to complete the task.'
                },
                outputSchema: {
                    type: 'object',
                    description: 'Optional JSON Schema defining the expected structure of the sub-agent output.',
                    additionalProperties: true
                }
            },
            required: ['task']
        }
    }

    async execute(args: Record<string, unknown>, _agentId: string, sessionId: string): Promise<unknown> {
        const task = args['task']
        const outputSchema = args['outputSchema']

        if (typeof task !== 'string' || !task.trim()) {
            throw new AgentToolError(`Agent "${this.agent.config.name}": "task" must be a non-empty string`)
        }

        if (outputSchema !== undefined && (typeof outputSchema !== 'object' || Array.isArray(outputSchema))) {
            throw new AgentToolError(
                `Agent "${this.agent.config.name}": "outputSchema" must be a valid JSON Schema object`
            )
        }

        const subSessionId = randomUUID()
        const session = await this.sessionManager.create(subSessionId, {
            title: `Sub-agent session: ${this.agent.config.name} / parent: ${sessionId}`
        })

        let lastMessage: string | null = null
        let structuredOutput: unknown = undefined

        const agentRunOptions: AgentRunOptions = {
            ...(outputSchema !== undefined && { outputSchema: outputSchema as Record<string, unknown> }),
            guardrailPolicy: {
                input: GUARDRAIL_CHECK_MODE.SAFE_SKIP,
                output: GUARDRAIL_CHECK_MODE.SAFE_SKIP,
                toolCall: GUARDRAIL_CHECK_MODE.FAIL
            }
        }

        try {
            for await (const event of this.agent.run(task, session, agentRunOptions)) {
                if (event.type === AGENT_EVENT_TYPE.MESSAGE) {
                    lastMessage = event.message
                }

                if (event.type === AGENT_EVENT_TYPE.STRUCTURED_OUTPUT) {
                    structuredOutput = event.output
                }

                if (event.type === AGENT_EVENT_TYPE.ERROR && !event.recoverable) {
                    throw new AgentToolError(`Agent "${this.agent.config.name}" failed: ${event.error}`)
                }
            }
        } finally {
            await this.sessionManager.delete(subSessionId)
        }

        if (structuredOutput !== undefined) {
            return structuredOutput
        }

        if (lastMessage !== null) {
            return lastMessage
        }

        throw new AgentToolError(`Agent "${this.agent.config.name}" completed without producing any result`)
    }
}
