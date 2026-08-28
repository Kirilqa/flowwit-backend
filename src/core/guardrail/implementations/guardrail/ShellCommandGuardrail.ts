import { ToolCall } from '@tool'
import { BaseToolPermissionGuardrail } from './bases/BaseToolPermissionGuardrail'

const EXECUTE_COMMAND_TOOL_NAME = 'execute_command'

export class ShellCommandGuardrail extends BaseToolPermissionGuardrail {
    readonly id = 'shell_command'

    protected getRuleKey(toolCall: ToolCall): string | null {
        if (toolCall.name !== EXECUTE_COMMAND_TOOL_NAME) {
            return null
        }

        return this.extractCommand(toolCall.arguments)
    }

    protected buildBlockReason(ruleKey: string): string {
        return `Command "${ruleKey}" is not allowed`
    }

    private extractCommand(args: Record<string, unknown>): string | null {
        const command = args['command']

        if (typeof command !== 'string' || command.trim().length === 0) {
            return null
        }

        return command.trim().split(/\s+/)[0] ?? null
    }
}
