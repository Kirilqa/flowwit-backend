import { AgentEvent } from '@agent'
import { ToolCall } from './ToolCall'
import { ToolResult } from './ToolResult'

export type ToolCallExecution = {
    toolCall: ToolCall
    toolResult: ToolResult
    event: AgentEvent
}
