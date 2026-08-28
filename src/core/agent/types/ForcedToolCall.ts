import { ToolInterface } from '@tool'

export type ForcedToolCall = {
    tool: ToolInterface
    arguments: Record<string, unknown>
    bypassGuardrails?: boolean
}
