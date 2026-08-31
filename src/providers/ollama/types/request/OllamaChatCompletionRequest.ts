import { OllamaMessageRequest } from './OllamaMessageRequest'
import { OllamaReasoningEffortRequest } from './OllamaReasoningEffortRequest'
import { OllamaResponseFormatRequest } from './OllamaResponseFormatRequest'
import { OllamaToolRequest } from './OllamaToolRequest'

export type OllamaChatCompletionRequest = {
    model: string
    messages: Array<OllamaMessageRequest>
    temperature?: number
    max_tokens?: number
    top_p?: number
    frequency_penalty?: number
    presence_penalty?: number
    stop?: Array<string>
    tools?: Array<OllamaToolRequest>
    response_format?: OllamaResponseFormatRequest
    stream?: boolean
    stream_options?: {
        include_usage: boolean
    }
    reasoning_effort?: OllamaReasoningEffortRequest
    seed?: number
}
