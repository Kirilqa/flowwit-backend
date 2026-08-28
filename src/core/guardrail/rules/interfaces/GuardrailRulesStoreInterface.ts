import { GuardrailRuleDecision } from '../types'

export interface GuardrailRulesStoreInterface {
    initialize(): Promise<void>
    getRule(
        guardrailId: string,
        ruleKey: string,
        sessionId: string,
        additionalRules?: Record<string, GuardrailRuleDecision>
    ): GuardrailRuleDecision | undefined
    getGlobalRule(guardrailId: string, ruleKey: string): GuardrailRuleDecision | undefined
    getSessionRule(guardrailId: string, ruleKey: string, sessionId: string): GuardrailRuleDecision | undefined
    getAllGlobalRules(guardrailId: string): Record<string, GuardrailRuleDecision>
    setGlobalRule(guardrailId: string, ruleKey: string, decision: GuardrailRuleDecision): Promise<void>
    setSessionRule(
        guardrailId: string,
        ruleKey: string,
        sessionId: string,
        decision: GuardrailRuleDecision
    ): Promise<void>
    deleteGlobalRule(guardrailId: string, ruleKey: string): Promise<void>
    clearSessionRules(sessionId: string): Promise<void>
}
