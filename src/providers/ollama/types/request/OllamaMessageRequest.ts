import { OllamaMessageContentPartRequest } from './OllamaMessageContentPartRequest'
import { OllamaMessageRole } from '../OllamaMessageRole'
import { OllamaToolCall } from '../OllamaToolCall'

export type OllamaMessageRequest = {
    role: OllamaMessageRole
    content: string | Array<OllamaMessageContentPartRequest> | null
    name?: string
    tool_calls?: Array<OllamaToolCall>
    tool_call_id?: string
}
