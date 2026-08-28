import { RegisterSkillTool } from '@tool/implementations/skill/RegisterSkillTool'
import { AgentToolError } from '@tool/errors'
import { Skill } from '@skill'
import {
    makeAgentInterface,
    makeAgentRegistry,
    makeRawAgentConfigRepository,
    makeSkillMock,
    makeSkillRegistryMock
} from '../../../../../helpers/makeAgent'

function makeSkill(name = 'my-skill'): Skill {
    return makeSkillMock({ name, description: 'A skill' })
}

describe('RegisterSkillTool', () => {
    it('has correct name', () => {
        const tool = new RegisterSkillTool(makeSkillRegistryMock(), makeAgentRegistry(), null)
        expect(tool.name).toBe('skill_register')
    })

    it('throws AgentToolError when the calling agent is not found', async () => {
        const tool = new RegisterSkillTool(makeSkillRegistryMock(), makeAgentRegistry(), null)
        await expect(tool.execute({ skillName: 'my-skill' }, 'nonexistent-caller', 'session-1')).rejects.toThrow(
            AgentToolError
        )
    })

    it('throws AgentToolError when the skill is not in the system registry', async () => {
        const caller = makeAgentInterface({ id: 'caller' })
        const tool = new RegisterSkillTool(makeSkillRegistryMock(), makeAgentRegistry([caller]), null)
        await expect(tool.execute({ skillName: 'ghost' }, 'caller', 'session-1')).rejects.toThrow(AgentToolError)
    })

    it('throws AgentToolError when the skill is already registered for the agent', async () => {
        const skill = makeSkill()
        const caller = makeAgentInterface({ id: 'caller', skills: [skill] })
        const tool = new RegisterSkillTool(makeSkillRegistryMock([skill]), makeAgentRegistry([caller]), null)
        await expect(tool.execute({ skillName: 'my-skill' }, 'caller', 'session-1')).rejects.toThrow(AgentToolError)
    })

    it('calls agent.update with the updated skills list', async () => {
        const skill = makeSkill()
        const caller = makeAgentInterface({ id: 'caller' })
        const tool = new RegisterSkillTool(makeSkillRegistryMock([skill]), makeAgentRegistry([caller]), null)
        await tool.execute({ skillName: 'my-skill' }, 'caller', 'session-1')
        expect(caller.update).toHaveBeenCalledWith(expect.objectContaining({ skills: expect.arrayContaining([skill]) }))
    })

    it('preserves already-registered skills when adding a new one', async () => {
        const existing = makeSkill('existing-skill')
        const skill = makeSkill()
        const caller = makeAgentInterface({ id: 'caller', skills: [existing] })
        const tool = new RegisterSkillTool(makeSkillRegistryMock([existing, skill]), makeAgentRegistry([caller]), null)
        await tool.execute({ skillName: 'my-skill' }, 'caller', 'session-1')
        const updateCall = (caller.update as jest.Mock).mock.calls[0]
        const patch = updateCall?.[0] as { skills: Array<Skill> }
        expect(patch.skills.map(s => s.name).sort()).toEqual(['existing-skill', 'my-skill'])
    })

    it('calls repository.update with the resolved skill names when repository is provided', async () => {
        const skill = makeSkill()
        const caller = makeAgentInterface({ id: 'caller' })
        const repo = makeRawAgentConfigRepository()
        const tool = new RegisterSkillTool(makeSkillRegistryMock([skill]), makeAgentRegistry([caller]), repo)
        await tool.execute({ skillName: 'my-skill' }, 'caller', 'session-1')
        expect(repo.update).toHaveBeenCalledWith('caller', { skills: ['my-skill'] })
    })

    it('does not call repository when repository is null', async () => {
        const skill = makeSkill()
        const caller = makeAgentInterface({ id: 'caller' })
        const repo = makeRawAgentConfigRepository()
        const tool = new RegisterSkillTool(makeSkillRegistryMock([skill]), makeAgentRegistry([caller]), null)
        await tool.execute({ skillName: 'my-skill' }, 'caller', 'session-1')
        expect(repo.update).not.toHaveBeenCalled()
    })

    it('returns a SkillSummary of the registered skill', async () => {
        const skill = makeSkill()
        const caller = makeAgentInterface({ id: 'caller' })
        const tool = new RegisterSkillTool(makeSkillRegistryMock([skill]), makeAgentRegistry([caller]), null)
        const result = (await tool.execute({ skillName: 'my-skill' }, 'caller', 'session-1')) as { name: string }
        expect(result.name).toBe('my-skill')
    })

    it('throws AgentToolError for invalid schema (empty skillName)', async () => {
        const tool = new RegisterSkillTool(makeSkillRegistryMock(), makeAgentRegistry(), null)
        await expect(tool.execute({ skillName: '' }, 'caller', 'session-1')).rejects.toThrow(AgentToolError)
    })
})
