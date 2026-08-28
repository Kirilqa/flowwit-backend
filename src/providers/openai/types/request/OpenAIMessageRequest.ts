import { OpenAIMessageContentPartRequest } from './OpenAIMessageContentPartRequest'
import { OpenAIMessageRole } from '../OpenAIMessageRole'
import { OpenAIToolCall } from '../OpenAIToolCall'

export type OpenAIMessageRequest = {
    role: OpenAIMessageRole
    content: string | Array<OpenAIMessageContentPartRequest> | null
    name?: string
    tool_calls?: Array<OpenAIToolCall>
    tool_call_id?: string
}
