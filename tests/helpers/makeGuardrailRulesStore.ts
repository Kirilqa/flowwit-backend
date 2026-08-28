import { GuardrailRulesStoreInterface, GuardrailRuleDecision } from '@guardrail'

export function makeNoopRulesStore(): GuardrailRulesStoreInterface {
    return {
        initialize: jest.fn().mockResolvedValue(undefined),
        getRule: jest.fn().mockReturnValue(undefined),
        getGlobalRule: jest.fn().mockReturnValue(undefined),
        getSessionRule: jest.fn().mockReturnValue(undefined),
        getAllGlobalRules: jest.fn().mockReturnValue({}),
        setGlobalRule: jest.fn().mockResolvedValue(undefined),
        setSessionRule: jest.fn().mockResolvedValue(undefined),
        deleteGlobalRule: jest.fn().mockResolvedValue(undefined),
        clearSessionRules: jest.fn().mockResolvedValue(undefined)
    }
}

export function makeRulesStoreWithRule(decision: GuardrailRuleDecision): GuardrailRulesStoreInterface {
    return {
        ...makeNoopRulesStore(),
        getRule: jest.fn().mockReturnValue(decision)
    }
}
