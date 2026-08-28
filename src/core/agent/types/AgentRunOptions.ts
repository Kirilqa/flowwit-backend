import { GuardrailRunPolicy } from '@guardrail'
import { ForcedToolCall } from './ForcedToolCall'

export type AgentRunOptions = {
    outputSchema?: Record<string, unknown>
    systemPrompt?: string
    forcedToolCalls?: Array<ForcedToolCall>
    guardrailPolicy?: GuardrailRunPolicy
}
