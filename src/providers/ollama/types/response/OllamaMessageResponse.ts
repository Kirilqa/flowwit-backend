import { OllamaToolCall } from '../OllamaToolCall'

export type OllamaMessageResponse = {
    role: 'assistant'
    content: string | null
    tool_calls?: Array<OllamaToolCall>
}
