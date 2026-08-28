import { ToolCall } from '@tool'
import { GuardrailCheckResult } from '../types'
import { GuardrailEvent } from '../types/GuardrailEvent'
import { GuardrailRuleDecision } from '../rules/types'

export interface GuardrailInterface {
    readonly id: string
    checkInput(
        input: string,
        sessionId: string,
        additionalRules?: Record<string, GuardrailRuleDecision>
    ): AsyncGenerator<GuardrailEvent, GuardrailCheckResult>
    checkOutput(
        output: string,
        sessionId: string,
        additionalRules?: Record<string, GuardrailRuleDecision>
    ): AsyncGenerator<GuardrailEvent, GuardrailCheckResult>
    checkToolCall(
        toolCall: ToolCall,
        sessionId: string,
        additionalRules?: Record<string, GuardrailRuleDecision>
    ): AsyncGenerator<GuardrailEvent, GuardrailCheckResult>
}
