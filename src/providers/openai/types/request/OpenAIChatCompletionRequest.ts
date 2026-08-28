import { OpenAIMessageRequest } from './OpenAIMessageRequest'
import { OpenAIReasoningEffortRequest } from './OpenAIReasoningEffortRequest'
import { OpenAIResponseFormatRequest } from './OpenAIResponseFormatRequest'
import { OpenAIToolChoiceRequest } from './OpenAIToolChoiceRequest'
import { OpenAIToolRequest } from './OpenAIToolRequest'

export type OpenAIChatCompletionRequest = {
    model: string
    messages: Array<OpenAIMessageRequest>
    temperature?: number
    max_completion_tokens?: number
    top_p?: number
    frequency_penalty?: number
    presence_penalty?: number
    stop?: Array<string>
    tools?: Array<OpenAIToolRequest>
    tool_choice?: OpenAIToolChoiceRequest
    parallel_tool_calls?: boolean
    response_format?: OpenAIResponseFormatRequest
    stream?: boolean
    stream_options?: {
        include_usage: boolean
    }
    reasoning_effort?: OpenAIReasoningEffortRequest
    n?: number
    logprobs?: boolean
    top_logprobs?: number
    seed?: number
}
