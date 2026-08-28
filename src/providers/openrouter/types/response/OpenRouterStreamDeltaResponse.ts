import { OpenRouterMessageRole } from '../OpenRouterMessageRole'
import { OpenRouterStreamToolCallDeltaResponse } from './OpenRouterStreamToolCallDeltaResponse'

export type OpenRouterStreamDeltaResponse = {
    role?: OpenRouterMessageRole
    content?: string | null
    tool_calls?: Array<OpenRouterStreamToolCallDeltaResponse>
    reasoning_content?: string | null
}
