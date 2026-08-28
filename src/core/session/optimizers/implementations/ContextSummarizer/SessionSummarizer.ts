import { randomUUID } from 'crypto'
import { ProviderInterface, CONTENT_TYPE, Message, MESSAGE_ROLE } from '@provider'
import { AgentMessage } from '@agent/types'
import { BaseSessionOptimizer } from '../../bases/BaseSessionOptimizer'
import { SUMMARIZER_SYSTEM_PROMPT } from './promts'
import { SessionSummarizerOptions } from './types'
import { SessionOptimizerInterface } from '../../interfaces'

const DEFAULT_OPTIONS: SessionSummarizerOptions = {
    threshold: 0.7,
    preserveRecentCount: 6
}

export class SessionSummarizer extends BaseSessionOptimizer implements SessionOptimizerInterface {
    private readonly options: SessionSummarizerOptions

    constructor(options: Partial<SessionSummarizerOptions> = {}) {
        const resultOptions = { ...DEFAULT_OPTIONS, ...options }
        super(resultOptions)
        this.options = resultOptions
    }

    async runOptimize(
        messages: Array<AgentMessage>,
        provider?: ProviderInterface,
        model?: string
    ): Promise<Array<AgentMessage>> {
        if (!provider || !model) {
            return messages
        }

        const { preserveRecentCount } = this.options

        const systemMessages = messages.filter(message => message.role === MESSAGE_ROLE.SYSTEM)
        const currentSessionMessages = messages.filter(message => message.metadata?.['currentSession'] === true)
        const pastMessages = messages.filter(
            message => message.role !== MESSAGE_ROLE.SYSTEM && !message.metadata?.['currentSession']
        )

        const summarizeUpToIndex = pastMessages.length - preserveRecentCount

        if (summarizeUpToIndex <= 0) {
            return messages
        }

        let toSummarize = pastMessages.slice(0, summarizeUpToIndex)
        let preserved = pastMessages.slice(summarizeUpToIndex)

        const splitIndex = this.findSafeSplitIndex(toSummarize, preserved)

        if (splitIndex !== summarizeUpToIndex) {
            toSummarize = pastMessages.slice(0, splitIndex)
            preserved = pastMessages.slice(splitIndex)
        }

        if (toSummarize.length === 0) {
            return messages
        }

        const summary = await this.summarize(toSummarize, provider, model)

        return [...systemMessages, summary, ...preserved, ...currentSessionMessages]
    }

    private findSafeSplitIndex(toSummarize: Array<AgentMessage>, preserved: Array<AgentMessage>): number {
        const preservedToolResultIds = this.extractToolResultIds(preserved)

        let adjustedSplitIndex = toSummarize.length

        for (let i = toSummarize.length - 1; i >= 0; i--) {
            const message = toSummarize[i]

            if (!message) break

            const toolCallIds = this.extractToolCallIds(message)

            if (toolCallIds.length === 0) break

            const hasOrphanedToolCall = toolCallIds.some(id => preservedToolResultIds.has(id))

            if (!hasOrphanedToolCall) break

            adjustedSplitIndex = i
        }

        return adjustedSplitIndex
    }

    private extractToolCallIds(message: AgentMessage): Array<string> {
        if (typeof message.content === 'string') return []

        return message.content.filter(part => part.type === CONTENT_TYPE.TOOL_CALL).map(part => part.toolCall.id)
    }

    private extractToolResultIds(messages: Array<AgentMessage>): Set<string> {
        const ids = new Set<string>()

        for (const message of messages) {
            if (typeof message.content === 'string') continue

            for (const part of message.content) {
                if (part.type === CONTENT_TYPE.TOOL_RESULT) {
                    ids.add(part.toolResult.id)
                }
            }
        }

        return ids
    }

    private async summarize(
        messages: Array<AgentMessage>,
        provider: ProviderInterface,
        model: string
    ): Promise<AgentMessage> {
        const providerMessages: Array<Message> = messages.map(message => ({
            role: message.role,
            content: message.content
        }))

        const result = await provider.generate({
            model,
            messages: [{ role: MESSAGE_ROLE.SYSTEM, content: SUMMARIZER_SYSTEM_PROMPT }, ...providerMessages]
        })

        const choice = result.data.choices[0]

        if (!choice) {
            return {
                id: randomUUID(),
                role: MESSAGE_ROLE.ASSISTANT,
                content: '[Summary unavailable]',
                createdAt: Date.now()
            }
        }

        const { content } = choice.message

        const text =
            typeof content === 'string'
                ? content
                : content
                      .filter(part => part.type === CONTENT_TYPE.TEXT)
                      .map(part => part.text)
                      .join('')

        return {
            id: randomUUID(),
            role: MESSAGE_ROLE.ASSISTANT,
            content: `[Summary of earlier conversation: ${text}]`,
            createdAt: Date.now()
        }
    }
}
