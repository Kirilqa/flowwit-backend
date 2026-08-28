import { BaseRegistry } from '@core/bases'
import { Skill, SkillRepositoryInterface } from '@skill'
import { SkillsUpdater } from '@skill/updaters/SkillsUpdater'
import { SkillRegistry } from '@skill/registries/SkillRegistry'
import { AgentRegistryInterface } from '@agent/interfaces/registries'
import { AgentInterface } from '@agent/interfaces'
import { AgentConfig } from '@agent/types'
import { WATCHER_EVENT_TYPE } from '@core/watcher'
import { makeSkillMock } from '../../../../helpers/makeAgent'

class InMemorySkillRepository implements SkillRepositoryInterface {
    private readonly store = new Map<string, Skill>()

    async findAll(): Promise<Array<Skill>> {
        return [...this.store.values()]
    }

    async findById(name: string): Promise<Skill | null> {
        return this.store.get(name) ?? null
    }

    async create(skill: Skill): Promise<Skill> {
        this.store.set(skill.name, skill)
        return skill
    }

    async update(name: string, patch: Partial<Skill>): Promise<Skill> {
        const existing = this.store.get(name)
        if (!existing) throw new Error(`Skill not found: ${name}`)
        const updated = { ...existing, ...patch } as Skill
        this.store.set(name, updated)
        return updated
    }

    async delete(name: string): Promise<void> {
        this.store.delete(name)
    }

    async writeResource(): Promise<void> {}

    async readResource(): Promise<Buffer> {
        return Buffer.alloc(0)
    }

    async deleteResource(): Promise<void> {}

    async resolveExecutablePath(): Promise<string> {
        return ''
    }

    async ensureInitialized(): Promise<void> {}
}

class SimpleAgentRegistry extends BaseRegistry<AgentInterface> implements AgentRegistryInterface {}

class TrackingSkillRegistry extends SkillRegistry {
    registerCount = 0
    override register(name: string, entity: Skill): void {
        this.registerCount++
        super.register(name, entity)
    }
}

function makeSkill(name: string, description = 'A test skill'): Skill {
    return makeSkillMock({ name, description, content: `Content for ${name}.` })
}

function makeAgent(skills: Array<Skill> = []): { agent: AgentInterface; updates: Array<Partial<AgentConfig>> } {
    const updates: Array<Partial<AgentConfig>> = []
    const agent: AgentInterface = {
        config: { model: 'x', systemPrompt: '', skills } as AgentConfig,
        update: (patch: Partial<AgentConfig>) => {
            updates.push(patch)
        },
        run: async function* () {},
        stop: async () => {}
    }
    return { agent, updates }
}

function addPath(skillName: string): string {
    return `/workspace/skills/${skillName}/SKILL.md`
}

function unlinkPath(skillName: string): string {
    return `/workspace/skills/${skillName}/SKILL.md`
}

describe('SkillsUpdater (integration)', () => {
    let skillRepo: InMemorySkillRepository
    let skillRegistry: TrackingSkillRegistry
    let agentRegistry: SimpleAgentRegistry
    let updater: SkillsUpdater

    beforeEach(() => {
        skillRepo = new InMemorySkillRepository()
        skillRegistry = new TrackingSkillRegistry()
        agentRegistry = new SimpleAgentRegistry()
        updater = new SkillsUpdater(skillRepo, skillRegistry, agentRegistry)
    })

    describe('handle(ADD)', () => {
        it('registers the skill derived from the file path', async () => {
            await skillRepo.create(makeSkill('my-skill'))

            await updater.handle({ type: WATCHER_EVENT_TYPE.ADD, path: addPath('my-skill') })

            expect(skillRegistry.has('my-skill')).toBe(true)
        })

        it('does nothing when the skill is not in the repository', async () => {
            await updater.handle({ type: WATCHER_EVENT_TYPE.ADD, path: addPath('unknown') })

            expect(skillRegistry.list()).toHaveLength(0)
        })

        it('skips re-registering when fingerprint is unchanged', async () => {
            const skill = makeSkill('stable')
            await skillRepo.create(skill)

            await updater.handle({ type: WATCHER_EVENT_TYPE.ADD, path: addPath('stable') })
            const first = skillRegistry.get('stable')

            await updater.handle({ type: WATCHER_EVENT_TYPE.ADD, path: addPath('stable') })

            expect(skillRegistry.get('stable')).toBe(first)
        })

        it('re-registers when skill description changes', async () => {
            await skillRepo.create(makeSkill('changing', 'Old description'))
            await updater.handle({ type: WATCHER_EVENT_TYPE.ADD, path: addPath('changing') })

            await skillRepo.update('changing', { description: 'New description' })
            await updater.handle({ type: WATCHER_EVENT_TYPE.ADD, path: addPath('changing') })

            expect(skillRegistry.get('changing')?.description).toBe('New description')
        })

        it('updates agents that use the registered skill', async () => {
            const skill = makeSkill('used-skill')
            await skillRepo.create(skill)
            const { agent, updates } = makeAgent([skill])
            agentRegistry.register('agent-1', agent)

            await skillRepo.update('used-skill', { description: 'Updated' })
            await updater.handle({ type: WATCHER_EVENT_TYPE.ADD, path: addPath('used-skill') })

            expect(updates.length).toBeGreaterThan(0)
            const lastUpdate = updates[updates.length - 1]
            expect(lastUpdate?.skills).toBeDefined()
        })

        it('preserves other skills on the agent when updating only the changed one', async () => {
            const changed = makeSkill('changed-skill', 'v1')
            const other = makeSkill('other-skill')
            await skillRepo.create(changed)
            const { agent, updates } = makeAgent([changed, other])
            agentRegistry.register('multi-skill-agent', agent)

            await skillRepo.update('changed-skill', { description: 'v2' })
            await updater.handle({ type: WATCHER_EVENT_TYPE.ADD, path: addPath('changed-skill') })

            const updatedSkills = updates[updates.length - 1]?.skills
            expect(updatedSkills).toHaveLength(2)
            expect(updatedSkills?.find(s => s.name === 'changed-skill')?.description).toBe('v2')
            expect(updatedSkills?.find(s => s.name === 'other-skill')?.description).toBe('A test skill')
        })

        it('skips agents that do not use the changed skill', async () => {
            await skillRepo.create(makeSkill('irrelevant'))
            const { agent, updates } = makeAgent([makeSkill('other-skill')])
            agentRegistry.register('agent-2', agent)

            await updater.handle({ type: WATCHER_EVENT_TYPE.ADD, path: addPath('irrelevant') })

            expect(updates).toHaveLength(0)
        })
    })

    describe('handle(CHANGE)', () => {
        it('registers the skill on first CHANGE', async () => {
            await skillRepo.create(makeSkill('new-via-change'))

            await updater.handle({ type: WATCHER_EVENT_TYPE.CHANGE, path: addPath('new-via-change') })

            expect(skillRegistry.has('new-via-change')).toBe(true)
        })

        it('re-registers only when content changed', async () => {
            await skillRepo.create(makeSkill('x', 'v1'))
            await updater.handle({ type: WATCHER_EVENT_TYPE.CHANGE, path: addPath('x') })

            const before = skillRegistry.get('x')
            await updater.handle({ type: WATCHER_EVENT_TYPE.CHANGE, path: addPath('x') })
            expect(skillRegistry.get('x')).toBe(before)

            await skillRepo.update('x', { description: 'v2' })
            await updater.handle({ type: WATCHER_EVENT_TYPE.CHANGE, path: addPath('x') })
            expect(skillRegistry.get('x')?.description).toBe('v2')
        })
    })

    describe('handle(UNLINK)', () => {
        it('unregisters the skill when SKILL.md is unlinked', async () => {
            const skill = makeSkill('removable')
            await skillRepo.create(skill)
            await updater.handle({ type: WATCHER_EVENT_TYPE.ADD, path: addPath('removable') })

            expect(skillRegistry.has('removable')).toBe(true)

            await updater.handle({ type: WATCHER_EVENT_TYPE.UNLINK, path: unlinkPath('removable') })

            expect(skillRegistry.has('removable')).toBe(false)
        })

        it('removes the skill from agents that use it', async () => {
            const skill = makeSkill('gone-skill')
            await skillRepo.create(skill)
            await updater.handle({ type: WATCHER_EVENT_TYPE.ADD, path: addPath('gone-skill') })

            const { agent, updates } = makeAgent([skill])
            agentRegistry.register('a1', agent)

            await updater.handle({ type: WATCHER_EVENT_TYPE.UNLINK, path: unlinkPath('gone-skill') })

            const lastUpdate = updates[updates.length - 1]
            expect(lastUpdate?.skills).toEqual([])
        })

        it('is a no-op when the skill was never registered', async () => {
            await updater.handle({ type: WATCHER_EVENT_TYPE.UNLINK, path: unlinkPath('never-existed') })

            expect(skillRegistry.list()).toHaveLength(0)
        })

        it('ignores unlink events for non-SKILL.md files', async () => {
            const skill = makeSkill('keep-skill')
            await skillRepo.create(skill)
            await updater.handle({ type: WATCHER_EVENT_TYPE.ADD, path: addPath('keep-skill') })

            await updater.handle({
                type: WATCHER_EVENT_TYPE.UNLINK,
                path: '/workspace/skills/keep-skill/resource.txt'
            })

            expect(skillRegistry.has('keep-skill')).toBe(true)
        })

        it('clears fingerprint so next ADD re-registers the skill', async () => {
            const skill = makeSkill('refetch')
            await skillRepo.create(skill)
            await updater.handle({ type: WATCHER_EVENT_TYPE.ADD, path: addPath('refetch') })
            const countAfterFirst = skillRegistry.registerCount

            await updater.handle({ type: WATCHER_EVENT_TYPE.UNLINK, path: unlinkPath('refetch') })
            await updater.handle({ type: WATCHER_EVENT_TYPE.ADD, path: addPath('refetch') })

            expect(skillRegistry.registerCount).toBeGreaterThan(countAfterFirst)
        })

        it('leaves agents unmodified that do not use the unlinked skill', async () => {
            const unlinked = makeSkill('gone-skill')
            await skillRepo.create(unlinked)
            await updater.handle({ type: WATCHER_EVENT_TYPE.ADD, path: addPath('gone-skill') })

            const { agent: agentWithOther, updates } = makeAgent([makeSkill('other-skill')])
            agentRegistry.register('a1', agentWithOther)

            await updater.handle({ type: WATCHER_EVENT_TYPE.UNLINK, path: unlinkPath('gone-skill') })

            expect(updates).toHaveLength(0)
        })
    })

    describe('handle() — agents with undefined skills', () => {
        it('handles agents without a skills property during handleUpsert', async () => {
            await skillRepo.create(makeSkill('my-skill'))
            const agentWithNoSkills: AgentInterface = {
                config: { model: 'x', systemPrompt: '' } as AgentConfig,
                update: () => {},
                run: async function* () {},
                stop: async () => {}
            }
            agentRegistry.register('no-skills', agentWithNoSkills)

            await expect(
                updater.handle({ type: WATCHER_EVENT_TYPE.ADD, path: addPath('my-skill') })
            ).resolves.toBeUndefined()
        })

        it('handles agents without a skills property during handleUnlink', async () => {
            await skillRepo.create(makeSkill('linked-skill'))
            await updater.handle({ type: WATCHER_EVENT_TYPE.ADD, path: addPath('linked-skill') })

            const agentWithNoSkills: AgentInterface = {
                config: { model: 'x', systemPrompt: '' } as AgentConfig,
                update: () => {},
                run: async function* () {},
                stop: async () => {}
            }
            agentRegistry.register('no-skills', agentWithNoSkills)

            await expect(
                updater.handle({ type: WATCHER_EVENT_TYPE.UNLINK, path: unlinkPath('linked-skill') })
            ).resolves.toBeUndefined()
        })
    })
})
