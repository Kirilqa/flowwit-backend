import { UnregisterSkillTool } from '@tool/implementations/skill/UnregisterSkillTool'
import { AgentToolError } from '@tool/errors'
import { Skill } from '@skill'
import {
    makeAgentInterface,
    makeAgentRegistry,
    makeRawAgentConfigRepository,
    makeSkillMock
} from '../../../../../helpers/makeAgent'

function makeSkill(name = 'my-skill'): Skill {
    return makeSkillMock({ name, description: 'A skill' })
}

describe('UnregisterSkillTool', () => {
    it('has correct name', () => {
        const tool = new UnregisterSkillTool(makeAgentRegistry(), null)
        expect(tool.name).toBe('skill_unregister')
    })

    it('throws AgentToolError when the calling agent is not found', async () => {
        const tool = new UnregisterSkillTool(makeAgentRegistry(), null)
        await expect(tool.execute({ skillName: 'my-skill' }, 'nonexistent-caller', 'session-1')).rejects.toThrow(
            AgentToolError
        )
    })

    it('throws AgentToolError when the skill is not registered for the agent', async () => {
        const caller = makeAgentInterface({ id: 'caller' })
        const tool = new UnregisterSkillTool(makeAgentRegistry([caller]), null)
        await expect(tool.execute({ skillName: 'my-skill' }, 'caller', 'session-1')).rejects.toThrow(AgentToolError)
    })

    it('calls agent.update removing the skill', async () => {
        const skill = makeSkill()
        const caller = makeAgentInterface({ id: 'caller', skills: [skill] })
        const tool = new UnregisterSkillTool(makeAgentRegistry([caller]), null)
        await tool.execute({ skillName: 'my-skill' }, 'caller', 'session-1')
        const updateCall = (caller.update as jest.Mock).mock.calls[0]
        const patch = updateCall?.[0] as { skills: Array<Skill> }
        expect(patch.skills).toHaveLength(0)
    })

    it('preserves other registered skills when unregistering one', async () => {
        const skillA = makeSkill('skill-a')
        const skillB = makeSkill('skill-b')
        const caller = makeAgentInterface({ id: 'caller', skills: [skillA, skillB] })
        const tool = new UnregisterSkillTool(makeAgentRegistry([caller]), null)
        await tool.execute({ skillName: 'skill-a' }, 'caller', 'session-1')
        const updateCall = (caller.update as jest.Mock).mock.calls[0]
        const patch = updateCall?.[0] as { skills: Array<Skill> }
        expect(patch.skills.map(s => s.name)).toEqual(['skill-b'])
    })

    it('calls repository.update when repository is provided', async () => {
        const skill = makeSkill()
        const caller = makeAgentInterface({ id: 'caller', skills: [skill] })
        const repo = makeRawAgentConfigRepository()
        const tool = new UnregisterSkillTool(makeAgentRegistry([caller]), repo)
        await tool.execute({ skillName: 'my-skill' }, 'caller', 'session-1')
        expect(repo.update).toHaveBeenCalledWith('caller', { skills: [] })
    })

    it('does not call repository when repository is null', async () => {
        const skill = makeSkill()
        const caller = makeAgentInterface({ id: 'caller', skills: [skill] })
        const repo = makeRawAgentConfigRepository()
        const tool = new UnregisterSkillTool(makeAgentRegistry([caller]), null)
        await tool.execute({ skillName: 'my-skill' }, 'caller', 'session-1')
        expect(repo.update).not.toHaveBeenCalled()
    })

    it('returns a success message containing the skill name', async () => {
        const skill = makeSkill()
        const caller = makeAgentInterface({ id: 'caller', skills: [skill] })
        const tool = new UnregisterSkillTool(makeAgentRegistry([caller]), null)
        const result = await tool.execute({ skillName: 'my-skill' }, 'caller', 'session-1')
        expect(result).toContain('my-skill')
    })

    it('throws AgentToolError for invalid schema (empty skillName)', async () => {
        const tool = new UnregisterSkillTool(makeAgentRegistry(), null)
        await expect(tool.execute({ skillName: '' }, 'caller', 'session-1')).rejects.toThrow(AgentToolError)
    })
})
