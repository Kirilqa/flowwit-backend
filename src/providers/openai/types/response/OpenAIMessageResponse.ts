import { OpenAIToolCall } from '../OpenAIToolCall'

export type OpenAIMessageResponse = {
    role: 'assistant'
    content: string | null
    tool_calls?: Array<OpenAIToolCall>
    reasoning_content?: string | null
}
