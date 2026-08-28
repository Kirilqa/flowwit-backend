import { GuardrailRulesRepositoryInterface, GuardrailRulesData } from '@guardrail'
import { GuardrailRulesStore } from '@guardrail/rules/implementations/GuardrailRulesStore'

function makeRepository(initial?: Partial<GuardrailRulesData>): GuardrailRulesRepositoryInterface {
    const data: GuardrailRulesData = {
        global: initial?.global ?? {},
        sessions: initial?.sessions ?? {}
    }
    return {
        load: jest.fn().mockResolvedValue(structuredClone(data)),
        save: jest.fn().mockResolvedValue(undefined),
        ensureInitialized: jest.fn().mockResolvedValue(undefined)
    }
}

describe('GuardrailRulesStore', () => {
    describe('initialize()', () => {
        it('loads data from repository', async () => {
            const repo = makeRepository({ global: { g1: { key1: 'approve_always' } } })
            const store = new GuardrailRulesStore(repo)
            await store.initialize()
            expect(repo.load).toHaveBeenCalledTimes(1)
            expect(store.getGlobalRule('g1', 'key1')).toBe('approve_always')
        })
    })

    describe('getRule()', () => {
        it('returns global rule when it exists', async () => {
            const repo = makeRepository({
                global: { g1: { key1: 'approve_always' } },
                sessions: { s1: { g1: { key1: 'deny_always' } } }
            })
            const store = new GuardrailRulesStore(repo)
            await store.initialize()
            expect(store.getRule('g1', 'key1', 's1')).toBe('approve_always')
        })

        it('returns session rule when global rule is absent', async () => {
            const repo = makeRepository({
                sessions: { s1: { g1: { key1: 'deny_always' } } }
            })
            const store = new GuardrailRulesStore(repo)
            await store.initialize()
            expect(store.getRule('g1', 'key1', 's1')).toBe('deny_always')
        })

        it('returns undefined when neither global nor session rule exists', async () => {
            const store = new GuardrailRulesStore(makeRepository())
            await store.initialize()
            expect(store.getRule('g1', 'key1', 's1')).toBeUndefined()
        })

        it('global rule takes priority over session rule', async () => {
            const repo = makeRepository({
                global: { g1: { key1: 'deny_always' } },
                sessions: { s1: { g1: { key1: 'approve_always' } } }
            })
            const store = new GuardrailRulesStore(repo)
            await store.initialize()
            expect(store.getRule('g1', 'key1', 's1')).toBe('deny_always')
        })

        it('returns an additionalRules match when neither global nor additionalRules-absent path applies', async () => {
            const store = new GuardrailRulesStore(makeRepository())
            await store.initialize()
            expect(store.getRule('g1', 'key1', 's1', { key1: 'deny_always' })).toBe('deny_always')
        })

        it('additionalRules take priority over the session rule', async () => {
            const repo = makeRepository({ sessions: { s1: { g1: { key1: 'approve_always' } } } })
            const store = new GuardrailRulesStore(repo)
            await store.initialize()
            expect(store.getRule('g1', 'key1', 's1', { key1: 'deny_always' })).toBe('deny_always')
        })

        it('falls through to the session rule when additionalRules do not match the key', async () => {
            const repo = makeRepository({ sessions: { s1: { g1: { key1: 'deny_always' } } } })
            const store = new GuardrailRulesStore(repo)
            await store.initialize()
            expect(store.getRule('g1', 'key1', 's1', { otherKey: 'approve_always' })).toBe('deny_always')
        })

        it('the global rule still wins even when additionalRules are provided', async () => {
            const repo = makeRepository({ global: { g1: { key1: 'approve_always' } } })
            const store = new GuardrailRulesStore(repo)
            await store.initialize()
            expect(store.getRule('g1', 'key1', 's1', { key1: 'deny_always' })).toBe('approve_always')
        })
    })

    describe('getGlobalRule()', () => {
        it('returns the stored global rule', async () => {
            const repo = makeRepository({ global: { g1: { myKey: 'approve_always' } } })
            const store = new GuardrailRulesStore(repo)
            await store.initialize()
            expect(store.getGlobalRule('g1', 'myKey')).toBe('approve_always')
        })

        it('returns undefined for unknown guardrailId', async () => {
            const store = new GuardrailRulesStore(makeRepository())
            await store.initialize()
            expect(store.getGlobalRule('unknown', 'key')).toBeUndefined()
        })

        it('returns undefined for unknown ruleKey', async () => {
            const repo = makeRepository({ global: { g1: { other: 'deny_always' } } })
            const store = new GuardrailRulesStore(repo)
            await store.initialize()
            expect(store.getGlobalRule('g1', 'missing')).toBeUndefined()
        })

        it('matches a glob pattern rule when there is no exact key match', async () => {
            const repo = makeRepository({ global: { g1: { 'fs_*': 'approve_always' } } })
            const store = new GuardrailRulesStore(repo)
            await store.initialize()
            expect(store.getGlobalRule('g1', 'fs_write')).toBe('approve_always')
        })

        it('prefers an exact key match over a glob pattern that also matches', async () => {
            const repo = makeRepository({ global: { g1: { 'fs_*': 'approve_always', fs_write: 'deny_always' } } })
            const store = new GuardrailRulesStore(repo)
            await store.initialize()
            expect(store.getGlobalRule('g1', 'fs_write')).toBe('deny_always')
        })

        it('returns deny_always when multiple matching glob patterns disagree', async () => {
            const repo = makeRepository({
                global: { g1: { 'fs_*': 'approve_always', 'fs_w*': 'deny_always' } }
            })
            const store = new GuardrailRulesStore(repo)
            await store.initialize()
            expect(store.getGlobalRule('g1', 'fs_write')).toBe('deny_always')
        })

        it('returns approve_always when all matching glob patterns agree', async () => {
            const repo = makeRepository({
                global: { g1: { 'fs_*': 'approve_always', 'fs_w*': 'approve_always' } }
            })
            const store = new GuardrailRulesStore(repo)
            await store.initialize()
            expect(store.getGlobalRule('g1', 'fs_write')).toBe('approve_always')
        })
    })

    describe('getSessionRule()', () => {
        it('returns the stored session rule', async () => {
            const repo = makeRepository({
                sessions: { s1: { g1: { key1: 'deny_always' } } }
            })
            const store = new GuardrailRulesStore(repo)
            await store.initialize()
            expect(store.getSessionRule('g1', 'key1', 's1')).toBe('deny_always')
        })

        it('returns undefined for unknown session', async () => {
            const store = new GuardrailRulesStore(makeRepository())
            await store.initialize()
            expect(store.getSessionRule('g1', 'key1', 'unknown-session')).toBeUndefined()
        })
    })

    describe('getAllGlobalRules()', () => {
        it('returns all global rules for a guardrailId', async () => {
            const repo = makeRepository({
                global: { g1: { key1: 'approve_always', key2: 'deny_always' } }
            })
            const store = new GuardrailRulesStore(repo)
            await store.initialize()
            expect(store.getAllGlobalRules('g1')).toEqual({ key1: 'approve_always', key2: 'deny_always' })
        })

        it('returns empty object for unknown guardrailId', async () => {
            const store = new GuardrailRulesStore(makeRepository())
            await store.initialize()
            expect(store.getAllGlobalRules('unknown')).toEqual({})
        })

        it('returns a copy, not a reference to internal data', async () => {
            const repo = makeRepository({ global: { g1: { key1: 'approve_always' } } })
            const store = new GuardrailRulesStore(repo)
            await store.initialize()
            const rules = store.getAllGlobalRules('g1')
            rules['key1'] = 'deny_always'
            expect(store.getGlobalRule('g1', 'key1')).toBe('approve_always')
        })
    })

    describe('setGlobalRule()', () => {
        it('makes the rule immediately readable', async () => {
            const store = new GuardrailRulesStore(makeRepository())
            await store.initialize()
            await store.setGlobalRule('g1', 'key1', 'approve_always')
            expect(store.getGlobalRule('g1', 'key1')).toBe('approve_always')
        })

        it('persists the change via repository.save', async () => {
            const repo = makeRepository()
            const store = new GuardrailRulesStore(repo)
            await store.initialize()
            await store.setGlobalRule('g1', 'key1', 'deny_always')
            expect(repo.save).toHaveBeenCalledTimes(1)
        })

        it('overwrites an existing global rule', async () => {
            const repo = makeRepository({ global: { g1: { key1: 'approve_always' } } })
            const store = new GuardrailRulesStore(repo)
            await store.initialize()
            await store.setGlobalRule('g1', 'key1', 'deny_always')
            expect(store.getGlobalRule('g1', 'key1')).toBe('deny_always')
        })
    })

    describe('setSessionRule()', () => {
        it('makes the rule immediately readable for that session', async () => {
            const store = new GuardrailRulesStore(makeRepository())
            await store.initialize()
            await store.setSessionRule('g1', 'key1', 's1', 'approve_always')
            expect(store.getSessionRule('g1', 'key1', 's1')).toBe('approve_always')
        })

        it('does not affect other sessions', async () => {
            const store = new GuardrailRulesStore(makeRepository())
            await store.initialize()
            await store.setSessionRule('g1', 'key1', 's1', 'approve_always')
            expect(store.getSessionRule('g1', 'key1', 's2')).toBeUndefined()
        })

        it('persists via repository.save', async () => {
            const repo = makeRepository()
            const store = new GuardrailRulesStore(repo)
            await store.initialize()
            await store.setSessionRule('g1', 'key1', 's1', 'deny_always')
            expect(repo.save).toHaveBeenCalledTimes(1)
        })

        it('can set a second rule for the same session (session already exists)', async () => {
            const store = new GuardrailRulesStore(makeRepository())
            await store.initialize()
            await store.setSessionRule('g1', 'key1', 's1', 'approve_always')
            await store.setSessionRule('g1', 'key2', 's1', 'deny_always')
            expect(store.getSessionRule('g1', 'key1', 's1')).toBe('approve_always')
            expect(store.getSessionRule('g1', 'key2', 's1')).toBe('deny_always')
        })

        it('can set a second rule for the same guardrailId in a session (guardrailId already exists)', async () => {
            const store = new GuardrailRulesStore(makeRepository())
            await store.initialize()
            await store.setSessionRule('g1', 'key1', 's1', 'approve_always')
            await store.setSessionRule('g1', 'key2', 's1', 'deny_always')
            expect(store.getSessionRule('g1', 'key2', 's1')).toBe('deny_always')
        })
    })

    describe('deleteGlobalRule()', () => {
        it('removes the rule', async () => {
            const repo = makeRepository({ global: { g1: { key1: 'approve_always' } } })
            const store = new GuardrailRulesStore(repo)
            await store.initialize()
            await store.deleteGlobalRule('g1', 'key1')
            expect(store.getGlobalRule('g1', 'key1')).toBeUndefined()
        })

        it('removes the guardrailId entry when no rules remain', async () => {
            const repo = makeRepository({ global: { g1: { key1: 'approve_always' } } })
            const store = new GuardrailRulesStore(repo)
            await store.initialize()
            await store.deleteGlobalRule('g1', 'key1')
            expect(store.getAllGlobalRules('g1')).toEqual({})
        })

        it('is a no-op for unknown guardrailId', async () => {
            const repo = makeRepository()
            const store = new GuardrailRulesStore(repo)
            await store.initialize()
            await expect(store.deleteGlobalRule('unknown', 'key1')).resolves.toBeUndefined()
            expect(repo.save).not.toHaveBeenCalled()
        })

        it('persists via repository.save', async () => {
            const repo = makeRepository({ global: { g1: { key1: 'approve_always' } } })
            const store = new GuardrailRulesStore(repo)
            await store.initialize()
            await store.deleteGlobalRule('g1', 'key1')
            expect(repo.save).toHaveBeenCalledTimes(1)
        })

        it('keeps guardrailId entry when other rules still remain', async () => {
            const repo = makeRepository({ global: { g1: { key1: 'approve_always', key2: 'deny_always' } } })
            const store = new GuardrailRulesStore(repo)
            await store.initialize()
            await store.deleteGlobalRule('g1', 'key1')
            expect(store.getGlobalRule('g1', 'key2')).toBe('deny_always')
        })
    })

    describe('clearSessionRules()', () => {
        it('removes all rules for the session', async () => {
            const repo = makeRepository({
                sessions: { s1: { g1: { key1: 'approve_always' }, g2: { key2: 'deny_always' } } }
            })
            const store = new GuardrailRulesStore(repo)
            await store.initialize()
            await store.clearSessionRules('s1')
            expect(store.getSessionRule('g1', 'key1', 's1')).toBeUndefined()
            expect(store.getSessionRule('g2', 'key2', 's1')).toBeUndefined()
        })

        it('does not affect other sessions', async () => {
            const repo = makeRepository({
                sessions: {
                    s1: { g1: { key1: 'approve_always' } },
                    s2: { g1: { key1: 'deny_always' } }
                }
            })
            const store = new GuardrailRulesStore(repo)
            await store.initialize()
            await store.clearSessionRules('s1')
            expect(store.getSessionRule('g1', 'key1', 's2')).toBe('deny_always')
        })

        it('is a no-op for unknown session', async () => {
            const repo = makeRepository()
            const store = new GuardrailRulesStore(repo)
            await store.initialize()
            await expect(store.clearSessionRules('unknown')).resolves.toBeUndefined()
            expect(repo.save).not.toHaveBeenCalled()
        })

        it('persists via repository.save', async () => {
            const repo = makeRepository({
                sessions: { s1: { g1: { key1: 'approve_always' } } }
            })
            const store = new GuardrailRulesStore(repo)
            await store.initialize()
            await store.clearSessionRules('s1')
            expect(repo.save).toHaveBeenCalledTimes(1)
        })
    })
})
