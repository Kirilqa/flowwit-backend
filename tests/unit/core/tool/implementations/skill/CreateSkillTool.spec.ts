import { CreateSkillTool } from '@tool/implementations/skill/CreateSkillTool'
import { AgentToolError } from '@tool/errors'
import { Skill } from '@skill'
import { makeSkillRegistryMock, makeSkillRepository } from '../../../../../helpers/makeAgent'

const VALID_ARGS = {
    name: 'new-skill',
    description: 'A brand new skill',
    content: '# Instructions'
}

describe('CreateSkillTool', () => {
    it('has correct name', () => {
        const tool = new CreateSkillTool(makeSkillRepository(), makeSkillRegistryMock())
        expect(tool.name).toBe('skill_create')
    })

    it('throws AgentToolError when a skill with the same name already exists', async () => {
        const existing: Skill = { name: 'new-skill', description: '', content: '', directory: '', resources: [] }
        const registry = makeSkillRegistryMock([existing])
        const tool = new CreateSkillTool(makeSkillRepository([existing]), registry)
        await expect(tool.execute(VALID_ARGS, 'caller', 'session-1')).rejects.toThrow(AgentToolError)
    })

    it('creates the skill via the repository', async () => {
        const repository = makeSkillRepository()
        const tool = new CreateSkillTool(repository, makeSkillRegistryMock())
        await tool.execute(VALID_ARGS, 'caller', 'session-1')
        expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'new-skill' }))
    })

    it('registers the created skill in the registry', async () => {
        const registry = makeSkillRegistryMock()
        const tool = new CreateSkillTool(makeSkillRepository(), registry)
        await tool.execute(VALID_ARGS, 'caller', 'session-1')
        expect(registry.register).toHaveBeenCalledWith('new-skill', expect.objectContaining({ name: 'new-skill' }))
    })

    it('returns a SkillSummary with the correct name and description', async () => {
        const tool = new CreateSkillTool(makeSkillRepository(), makeSkillRegistryMock())
        const result = (await tool.execute(VALID_ARGS, 'caller', 'session-1')) as { name: string; description: string }
        expect(result.name).toBe('new-skill')
        expect(result.description).toBe('A brand new skill')
    })

    it('includes optional license, compatibility, allowedTools and metadata when provided', async () => {
        const repository = makeSkillRepository()
        const tool = new CreateSkillTool(repository, makeSkillRegistryMock())
        await tool.execute(
            {
                ...VALID_ARGS,
                license: 'MIT',
                compatibility: 'node >= 18',
                allowedTools: ['filesystem_read_file'],
                metadata: { category: 'dev' }
            },
            'caller',
            'session-1'
        )
        expect(repository.create).toHaveBeenCalledWith(
            expect.objectContaining({
                license: 'MIT',
                compatibility: 'node >= 18',
                allowedTools: ['filesystem_read_file'],
                metadata: { category: 'dev' }
            })
        )
    })

    it('omits optional fields from the created skill when not provided', async () => {
        const repository = makeSkillRepository()
        const tool = new CreateSkillTool(repository, makeSkillRegistryMock())
        await tool.execute(VALID_ARGS, 'caller', 'session-1')
        const created = (repository.create as jest.Mock).mock.calls[0]?.[0] as Skill
        expect(created).not.toHaveProperty('license')
        expect(created).not.toHaveProperty('compatibility')
        expect(created).not.toHaveProperty('allowedTools')
        expect(created).not.toHaveProperty('metadata')
    })

    it('throws AgentToolError for invalid schema (missing required field)', async () => {
        const tool = new CreateSkillTool(makeSkillRepository(), makeSkillRegistryMock())
        await expect(tool.execute({ description: 'no name' }, 'caller', 'session-1')).rejects.toThrow(AgentToolError)
    })
})
