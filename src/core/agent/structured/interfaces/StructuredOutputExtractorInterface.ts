import { Message, ProviderInterface } from '@provider'
import { AgentEvent } from '../../types'

export interface StructuredOutputExtractorInterface {
    extract(
        provider: ProviderInterface,
        model: string,
        messages: Array<Message>,
        outputSchema: Record<string, unknown>,
        agentId: string,
        sessionId: string
    ): AsyncIterable<AgentEvent>
}
