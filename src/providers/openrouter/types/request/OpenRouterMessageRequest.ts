import { OpenRouterMessageContentPartRequest } from './OpenRouterMessageContentPartRequest'
import { OpenRouterMessageRole } from '../OpenRouterMessageRole'
import { OpenRouterToolCall } from '../OpenRouterToolCall'

export type OpenRouterMessageRequest = {
    role: OpenRouterMessageRole
    content: string | Array<OpenRouterMessageContentPartRequest> | null
    name?: string
    tool_calls?: Array<OpenRouterToolCall>
    tool_call_id?: string
}
