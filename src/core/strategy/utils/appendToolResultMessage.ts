import { CONTENT_TYPE, Message, MESSAGE_ROLE } from '@provider'
import { ToolCall, ToolResult } from '@tool'

export function appendToolResultMessage(messages: Array<Message>, toolCall: ToolCall, toolResult: ToolResult): void {
    messages.push({
        role: MESSAGE_ROLE.TOOL_RESULT,
        content: [
            {
                type: CONTENT_TYPE.TOOL_RESULT,
                toolResult: {
                    id: toolCall.id,
                    content:
                        typeof toolResult.output === 'string' ? toolResult.output : JSON.stringify(toolResult.output),
                    isError: toolResult.isError
                }
            }
        ]
    })
}
