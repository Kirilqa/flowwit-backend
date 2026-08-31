import { LMStudioMessageRequest } from './LMStudioMessageRequest'
import { LMStudioReasoningEffortRequest } from './LMStudioReasoningEffortRequest'
import { LMStudioResponseFormatRequest } from './LMStudioResponseFormatRequest'
import { LMStudioToolRequest } from './LMStudioToolRequest'

export type LMStudioChatCompletionRequest = {
    model: string
    messages: Array<LMStudioMessageRequest>
    temperature?: number
    max_tokens?: number
    top_p?: number
    frequency_penalty?: number
    presence_penalty?: number
    stop?: Array<string>
    tools?: Array<LMStudioToolRequest>
    response_format?: LMStudioResponseFormatRequest
    stream?: boolean
    stream_options?: {
        include_usage: boolean
    }
    reasoning_effort?: LMStudioReasoningEffortRequest
    seed?: number
}
