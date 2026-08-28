import { CONTENT_TYPE, Message, MESSAGE_ROLE } from '@provider'
import { ToolCall } from '@tool'

export function appendToolCallMessage(messages: Array<Message>, toolCall: ToolCall): void {
    messages.push({
        role: MESSAGE_ROLE.ASSISTANT,
        content: [
            {
                type: CONTENT_TYPE.TOOL_CALL,
                toolCall: {
                    id: toolCall.id,
                    function: {
                        name: toolCall.name,
                        arguments: JSON.stringify(toolCall.arguments)
                    }
                }
            }
        ]
    })
}
