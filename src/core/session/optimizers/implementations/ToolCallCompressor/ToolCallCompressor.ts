import { CONTENT_TYPE, MESSAGE_ROLE, MessageContentPart } from '@provider'
import { AgentMessage } from '@agent/types'
import { BaseSessionOptimizer } from '../../bases/BaseSessionOptimizer'
import { ToolCallCompressorOptions } from './types'
import { SessionOptimizerInterface } from '../../interfaces'

const DEFAULT_OPTIONS: ToolCallCompressorOptions = {
    threshold: 0.5,
    argumentsSizeThreshold: 500,
    resultSizeThreshold: 1000,
    preserveRecentCount: 6
}

export class ToolCallCompressor extends BaseSessionOptimizer implements SessionOptimizerInterface {
    private readonly options: ToolCallCompressorOptions

    constructor(options: Partial<ToolCallCompressorOptions> = {}) {
        const resultOptions = { ...DEFAULT_OPTIONS, ...options }
        super(resultOptions)
        this.options = resultOptions
    }

    async runOptimize(messages: Array<AgentMessage>): Promise<Array<AgentMessage>> {
        const { preserveRecentCount } = this.options

        const systemMessages = messages.filter(message => message.role === MESSAGE_ROLE.SYSTEM)
        const currentSessionMessages = messages.filter(message => message.metadata?.['currentSession'] === true)
        const pastMessages = messages.filter(
            message => message.role !== MESSAGE_ROLE.SYSTEM && !message.metadata?.['currentSession']
        )

        const compressUpToIndex = pastMessages.length - preserveRecentCount

        if (compressUpToIndex <= 0) {
            return messages
        }

        const compressable = pastMessages.slice(0, compressUpToIndex)
        const preserved = pastMessages.slice(compressUpToIndex)

        const compressed = compressable.map(message => this.compressMessage(message))

        return [...systemMessages, ...compressed, ...preserved, ...currentSessionMessages]
    }

    private compressMessage(message: AgentMessage): AgentMessage {
        if (typeof message.content === 'string') {
            return message
        }

        const compressedContent = message.content.map(part => this.compressPart(part))

        return { ...message, content: compressedContent }
    }

    private compressPart(part: MessageContentPart): MessageContentPart {
        if (part.type === CONTENT_TYPE.TOOL_CALL) {
            const { argumentsSizeThreshold } = this.options
            const args = part.toolCall.function.arguments

            if (args.length <= argumentsSizeThreshold) {
                return part
            }

            return {
                ...part,
                toolCall: {
                    ...part.toolCall,
                    function: {
                        ...part.toolCall.function,
                        arguments: '[truncated]'
                    }
                }
            }
        }

        if (part.type === CONTENT_TYPE.TOOL_RESULT) {
            const { resultSizeThreshold } = this.options
            const content = part.toolResult.content

            if (content.length <= resultSizeThreshold) {
                return part
            }

            return {
                ...part,
                toolResult: {
                    ...part.toolResult,
                    content: `[result truncated, length: ${content.length}]`
                }
            }
        }

        return part
    }
}
