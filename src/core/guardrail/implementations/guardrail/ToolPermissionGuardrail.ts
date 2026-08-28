import { ToolCall, ToolInterface } from '@tool'
import { BaseToolPermissionGuardrail } from './bases/BaseToolPermissionGuardrail'
import { GuardrailRulesStoreInterface } from '../../rules/interfaces/GuardrailRulesStoreInterface'

export class ToolPermissionGuardrail extends BaseToolPermissionGuardrail {
    readonly id = 'tool_permission'

    private readonly defaultToolNames: ReadonlySet<string>

    constructor(rulesStore: GuardrailRulesStoreInterface, defaultTools: Array<ToolInterface>) {
        super(rulesStore)
        this.defaultToolNames = new Set(defaultTools.map(tool => tool.name))
    }

    protected getRuleKey(toolCall: ToolCall): string | null {
        if (this.defaultToolNames.has(toolCall.name)) return null
        return toolCall.name
    }

    protected buildBlockReason(_ruleKey: string, toolName: string): string {
        return `Tool "${toolName}" is not allowed`
    }
}
