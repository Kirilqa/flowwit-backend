import { OpenRouterMessageRequest } from './OpenRouterMessageRequest'
import { OpenRouterReasoningEffortRequest } from './OpenRouterReasoningEffortRequest'
import { OpenRouterResponseFormatRequest } from './OpenRouterResponseFormatRequest'
import { OpenRouterToolChoiceRequest } from './OpenRouterToolChoiceRequest'
import { OpenRouterToolRequest } from './OpenRouterToolRequest'

export type OpenRouterChatCompletionRequest = {
    model: string
    messages: Array<OpenRouterMessageRequest>
    temperature?: number
    max_completion_tokens?: number
    top_p?: number
    frequency_penalty?: number
    presence_penalty?: number
    stop?: Array<string>
    tools?: Array<OpenRouterToolRequest>
    tool_choice?: OpenRouterToolChoiceRequest
    parallel_tool_calls?: boolean
    response_format?: OpenRouterResponseFormatRequest
    stream?: boolean
    stream_options?: {
        include_usage: boolean
    }
    reasoning_effort?: OpenRouterReasoningEffortRequest
    n?: number
    logprobs?: boolean
    top_logprobs?: number
    seed?: number
}
