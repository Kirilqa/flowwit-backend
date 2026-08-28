import { OpenAIMessageRole } from '../OpenAIMessageRole'
import { OpenAIStreamToolCallDeltaResponse } from './OpenAIStreamToolCallDeltaResponse'

export type OpenAIStreamDeltaResponse = {
    role?: OpenAIMessageRole
    content?: string | null
    tool_calls?: Array<OpenAIStreamToolCallDeltaResponse>
    reasoning_content?: string | null
}
