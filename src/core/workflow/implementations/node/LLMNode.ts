import { getErrorMessage } from '@core/utils'
import { CONTENT_TYPE, Message, ProviderRegistryInterface } from '@provider'
import { z } from 'zod'
import { WorkFlowNodeError } from '../../errors/WorkFlowNodeError'
import { WORKFLOW_EVENT_TYPE } from '../../types/WorkFlowEventType'
import { WorkFlowNodeEvent } from '../../types/WorkFlowNodeEvent'
import { WorkFlowNodeResult } from '../../types/WorkFlowNodeResult'
import { BaseWorkFlowNode } from './bases/BaseWorkFlowNode'
import { llmNodePortsSchema, llmNodeOutputsSchema, llmNodeConfigSchema } from './validators'

export class LLMNode extends BaseWorkFlowNode<
    typeof llmNodePortsSchema,
    typeof llmNodeOutputsSchema,
    typeof llmNodeConfigSchema
> {
    readonly type = 'llm' as const
    readonly ports = llmNodePortsSchema
    readonly outputs = llmNodeOutputsSchema
    override readonly configSchema = llmNodeConfigSchema

    constructor(private readonly providerRegistry: ProviderRegistryInterface) {
        super()
    }

    protected async *run(
        ports: z.infer<typeof llmNodePortsSchema>,
        config: z.infer<typeof llmNodeConfigSchema>
    ): AsyncGenerator<WorkFlowNodeEvent, WorkFlowNodeResult<z.infer<typeof llmNodeOutputsSchema>>> {
        const provider = this.providerRegistry.get(config.providerName)

        if (provider === null) {
            throw new WorkFlowNodeError(`Provider "${config.providerName}" not found in registry`)
        }

        const messages: Array<Message> = []

        if (config.systemPrompt !== undefined) {
            messages.push({
                role: 'system',
                content: config.systemPrompt
            })
        }

        if (config.messages !== undefined) {
            for (const message of config.messages) {
                messages.push(message as Message)
            }
        }

        messages.push({
            role: 'user',
            content: ports.prompt
        })

        let text = ''

        try {
            const stream = provider.generateStream({
                model: config.model,
                messages,
                stream: true,
                ...(config.temperature !== undefined && { temperature: config.temperature }),
                ...(config.maxTokens !== undefined && { maxTokens: config.maxTokens })
            })

            for await (const chunk of stream) {
                if (chunk.state !== 'streaming') continue

                const content = chunk.delta.content

                if (content === undefined) continue

                for (const part of content) {
                    if (part.type !== CONTENT_TYPE.TEXT) continue

                    text += part.text

                    yield {
                        type: WORKFLOW_EVENT_TYPE.NODE_EVENT,
                        payload: { delta: part.text },
                        createdAt: Date.now()
                    }
                }
            }
        } catch (error) {
            throw new WorkFlowNodeError(
                `LLM generation failed for provider "${config.providerName}": ${getErrorMessage(error)}`
            )
        }

        return { output: { text } }
    }
}
