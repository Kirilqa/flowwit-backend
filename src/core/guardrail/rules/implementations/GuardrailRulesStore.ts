import picomatch from 'picomatch'
import { GuardrailRulesRepositoryInterface } from '../interfaces/repositories'
import { GuardrailRulesStoreInterface } from '../interfaces/GuardrailRulesStoreInterface'
import { GUARDRAIL_RULE_DECISION, GuardrailRuleDecision, GuardrailRulesData } from '../types'

function toNestedMap(record: Record<string, Record<string, GuardrailRuleDecision>>): RuleMap {
    return new Map(Object.entries(record).map(([key, rules]) => [key, new Map(Object.entries(rules))]))
}

function fromNestedMap(map: RuleMap): Record<string, Record<string, GuardrailRuleDecision>> {
    return Object.fromEntries(Array.from(map, ([key, rules]) => [key, Object.fromEntries(rules)]))
}

type RuleMap = Map<string, Map<string, GuardrailRuleDecision>>
type SessionRuleMap = Map<string, RuleMap>

export class GuardrailRulesStore implements GuardrailRulesStoreInterface {
    private global: RuleMap = new Map()
    private sessions: SessionRuleMap = new Map()

    constructor(private readonly repository: GuardrailRulesRepositoryInterface) {}

    async initialize(): Promise<void> {
        const data = await this.repository.load()
        this.global = toNestedMap(data.global)
        this.sessions = new Map(
            Object.entries(data.sessions).map(([sessionId, rules]) => [sessionId, toNestedMap(rules)])
        )
    }

    getRule(
        guardrailId: string,
        ruleKey: string,
        sessionId: string,
        additionalRules?: Record<string, GuardrailRuleDecision>
    ): GuardrailRuleDecision | undefined {
        const globalRule = this.getGlobalRule(guardrailId, ruleKey)
        if (globalRule !== undefined) return globalRule

        if (additionalRules !== undefined) {
            const additionalRule = this.resolveDecision(new Map(Object.entries(additionalRules)), ruleKey)
            if (additionalRule !== undefined) return additionalRule
        }

        return this.getSessionRule(guardrailId, ruleKey, sessionId)
    }

    getGlobalRule(guardrailId: string, ruleKey: string): GuardrailRuleDecision | undefined {
        const rules = this.global.get(guardrailId)
        if (!rules) return undefined
        return this.resolveDecision(rules, ruleKey)
    }

    getSessionRule(guardrailId: string, ruleKey: string, sessionId: string): GuardrailRuleDecision | undefined {
        return this.sessions.get(sessionId)?.get(guardrailId)?.get(ruleKey)
    }

    getAllGlobalRules(guardrailId: string): Record<string, GuardrailRuleDecision> {
        return Object.fromEntries(this.global.get(guardrailId) ?? [])
    }

    async setGlobalRule(guardrailId: string, ruleKey: string, decision: GuardrailRuleDecision): Promise<void> {
        let rules = this.global.get(guardrailId)

        if (!rules) {
            rules = new Map()
            this.global.set(guardrailId, rules)
        }

        rules.set(ruleKey, decision)
        await this.persist()
    }

    async setSessionRule(
        guardrailId: string,
        ruleKey: string,
        sessionId: string,
        decision: GuardrailRuleDecision
    ): Promise<void> {
        let guardrailRules = this.sessions.get(sessionId)

        if (!guardrailRules) {
            guardrailRules = new Map()
            this.sessions.set(sessionId, guardrailRules)
        }

        let rules = guardrailRules.get(guardrailId)

        if (!rules) {
            rules = new Map()
            guardrailRules.set(guardrailId, rules)
        }

        rules.set(ruleKey, decision)
        await this.persist()
    }

    async deleteGlobalRule(guardrailId: string, ruleKey: string): Promise<void> {
        const rules = this.global.get(guardrailId)
        if (!rules) return

        rules.delete(ruleKey)

        if (rules.size === 0) {
            this.global.delete(guardrailId)
        }

        await this.persist()
    }

    async clearSessionRules(sessionId: string): Promise<void> {
        if (!this.sessions.has(sessionId)) return

        this.sessions.delete(sessionId)
        await this.persist()
    }

    private resolveDecision(
        rules: Map<string, GuardrailRuleDecision>,
        ruleKey: string
    ): GuardrailRuleDecision | undefined {
        const exactMatch = rules.get(ruleKey)
        if (exactMatch !== undefined) return exactMatch

        const matchedDecisions = Array.from(rules)
            .filter(([storedKey]) => picomatch(storedKey)(ruleKey))
            .map(([, decision]) => decision)

        if (matchedDecisions.length === 0) return undefined
        if (matchedDecisions.includes(GUARDRAIL_RULE_DECISION.DENY_ALWAYS)) return GUARDRAIL_RULE_DECISION.DENY_ALWAYS
        return GUARDRAIL_RULE_DECISION.APPROVE_ALWAYS
    }

    private async persist(): Promise<void> {
        const data: GuardrailRulesData = {
            global: fromNestedMap(this.global),
            sessions: Object.fromEntries(
                Array.from(this.sessions, ([sessionId, rules]) => [sessionId, fromNestedMap(rules)])
            )
        }

        await this.repository.save(data)
    }
}
