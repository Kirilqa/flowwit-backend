import { randomUUID } from 'crypto'
import { ToolCall } from '@tool'
import { GUARDRAIL_ACTION, GuardrailCheckResult } from '../../../types'
import {
    GuardrailEvent,
    GUARDRAIL_REQUEST_CONTEXT_TYPE,
    GUARDRAIL_REQUEST_DECISION,
    GuardrailRequestDecision,
    PendingEntry
} from '../../../types'
import { GuardrailInterface } from '../../../interfaces/GuardrailInterface'
import { GuardrailResolverInterface } from '../../../interfaces/GuardrailResolverInterface'
import { GuardrailRulesStoreInterface } from '../../../rules/interfaces/GuardrailRulesStoreInterface'
import { GuardrailRuleDecision } from '../../../rules/types'

export abstract class BaseToolPermissionGuardrail implements GuardrailInterface, GuardrailResolverInterface {
    abstract readonly id: string

    private readonly pending = new Map<string, PendingEntry>()

    constructor(private readonly rulesStore: GuardrailRulesStoreInterface) {}

    resolve(requestId: string, decision: GuardrailRequestDecision): void {
        this.pending.get(requestId)?.resolve(decision)
        this.pending.delete(requestId)
    }

    abort(sessionId: string): void {
        for (const [requestId, entry] of this.pending) {
            if (entry.sessionId === sessionId) {
                entry.resolve(GUARDRAIL_REQUEST_DECISION.ABORTED)
                this.pending.delete(requestId)
            }
        }
    }

    async *checkInput(_input: string, _sessionId: string): AsyncGenerator<GuardrailEvent, GuardrailCheckResult> {
        return { action: GUARDRAIL_ACTION.ALLOW }
    }

    async *checkOutput(_output: string, _sessionId: string): AsyncGenerator<GuardrailEvent, GuardrailCheckResult> {
        return { action: GUARDRAIL_ACTION.ALLOW }
    }

    async *checkToolCall(
        toolCall: ToolCall,
        sessionId: string,
        additionalRules?: Record<string, GuardrailRuleDecision>
    ): AsyncGenerator<GuardrailEvent, GuardrailCheckResult> {
        const ruleKey = this.getRuleKey(toolCall)

        if (ruleKey === null) {
            return { action: GUARDRAIL_ACTION.ALLOW }
        }

        const savedRule = this.rulesStore.getRule(this.id, ruleKey, sessionId, additionalRules)

        if (savedRule === GUARDRAIL_REQUEST_DECISION.APPROVE_ALWAYS) {
            return { action: GUARDRAIL_ACTION.ALLOW }
        }

        if (savedRule === GUARDRAIL_REQUEST_DECISION.DENY_ALWAYS) {
            return {
                action: GUARDRAIL_ACTION.BLOCK,
                reason: this.buildDenyReason(ruleKey, toolCall.name, GUARDRAIL_REQUEST_DECISION.DENY_ALWAYS)
            }
        }

        const requestId = randomUUID()

        yield {
            requestId,
            context: {
                type: GUARDRAIL_REQUEST_CONTEXT_TYPE.TOOL_CALL,
                toolCallId: toolCall.id
            },
            createdAt: Date.now()
        }

        const decision = await new Promise<GuardrailRequestDecision>(resolve => {
            this.pending.set(requestId, { sessionId, resolve })
        })

        if (decision === GUARDRAIL_REQUEST_DECISION.APPROVE_ALWAYS) {
            await this.rulesStore.setSessionRule(this.id, ruleKey, sessionId, GUARDRAIL_REQUEST_DECISION.APPROVE_ALWAYS)
            return { action: GUARDRAIL_ACTION.ALLOW }
        }

        if (decision === GUARDRAIL_REQUEST_DECISION.DENY_ALWAYS) {
            await this.rulesStore.setSessionRule(this.id, ruleKey, sessionId, GUARDRAIL_REQUEST_DECISION.DENY_ALWAYS)
            return {
                action: GUARDRAIL_ACTION.BLOCK,
                reason: this.buildDenyReason(ruleKey, toolCall.name, GUARDRAIL_REQUEST_DECISION.DENY_ALWAYS)
            }
        }

        if (decision === GUARDRAIL_REQUEST_DECISION.DENY) {
            return {
                action: GUARDRAIL_ACTION.BLOCK,
                reason: this.buildDenyReason(ruleKey, toolCall.name, GUARDRAIL_REQUEST_DECISION.DENY)
            }
        }

        if (decision === GUARDRAIL_REQUEST_DECISION.ABORTED) {
            return {
                action: GUARDRAIL_ACTION.BLOCK,
                reason: this.buildAbortedReason(toolCall.name)
            }
        }

        return { action: GUARDRAIL_ACTION.ALLOW }
    }

    protected abstract getRuleKey(toolCall: ToolCall): string | null
    protected abstract buildBlockReason(ruleKey: string, toolName: string): string

    private buildDenyReason(
        ruleKey: string,
        toolName: string,
        decision: typeof GUARDRAIL_REQUEST_DECISION.DENY | typeof GUARDRAIL_REQUEST_DECISION.DENY_ALWAYS
    ): string {
        const isPermanent = decision === GUARDRAIL_REQUEST_DECISION.DENY_ALWAYS

        return [
            isPermanent ? 'Tool call was permanently blocked by the user.' : 'Tool call was rejected by the user.',
            `Reason: ${isPermanent ? 'permanent_rejection' : 'manual_rejection'}`,
            `Tool: ${toolName}`,
            `Detail: ${this.buildBlockReason(ruleKey, toolName)}`,
            isPermanent
                ? 'Suggestion: This tool has been permanently denied for this session. Do not attempt to call it again. Ask the user what alternative approach they prefer.'
                : 'Suggestion: The user does not want this action performed. Ask the user what alternative approach they prefer before retrying.'
        ].join('\n')
    }

    private buildAbortedReason(toolName: string): string {
        return [
            'Tool call was cancelled because the user stopped the generation.',
            'Reason: generation_stopped',
            `Tool: ${toolName}`,
            'Suggestion: Do not retry this tool call.'
        ].join('\n')
    }
}
