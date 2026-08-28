import { FinishReason } from './FinishReason'
import { Message } from '../Message'
import { ThinkingContent } from '../MessageContentPart'
import { TokenLogprob } from './TokenLogprob'
import { Usage } from './Usage'

export type GenerationResult = {
    data: {
        id: string
        model: string
        choices: Array<{
            index: number
            message: Message
            finishReason: FinishReason
            logprobs?: Array<TokenLogprob>
            reasoning?: Array<ThinkingContent>
        }>
        usage: Usage
    }
    meta: {
        provider: string
        latencyMs: number
        costUsd?: number
        requestId?: string
        reasoningDurationMs?: number
    }
}
