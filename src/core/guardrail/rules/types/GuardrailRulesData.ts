import { GuardrailRuleDecision } from './GuardrailRuleDecision'

export type GuardrailRulesData = {
    global: Record<string, Record<string, GuardrailRuleDecision>>
    sessions: Record<string, Record<string, Record<string, GuardrailRuleDecision>>>
}
