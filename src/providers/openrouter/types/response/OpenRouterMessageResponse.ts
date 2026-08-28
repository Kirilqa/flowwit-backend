import { OpenRouterToolCall } from '../OpenRouterToolCall'

export type OpenRouterMessageResponse = {
    role: 'assistant'
    content: string | null
    tool_calls?: Array<OpenRouterToolCall>
    reasoning_content?: string | null
}
