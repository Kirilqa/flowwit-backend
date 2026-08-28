import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { ReadSkillResourceTool } from '@tool/implementations/skill/ReadSkillResourceTool'
import { AgentToolError } from '@tool/errors'
import { MarkdownSkillRepository, Skill } from '@skill'
import { makeSkillMock, makeSkillRegistryMock } from '../../../../../helpers/makeAgent'
import { makeTempDir, removeTempDir } from '../../../../../helpers/tempDir'

function makeSkill(): Skill {
    return makeSkillMock({ name: 'my-skill', resources: ['notes.md'] })
}

describe('ReadSkillResourceTool', () => {
    let tempDir: string

    beforeEach(async () => {
        tempDir = await makeTempDir('skill-resource-test')
        await mkdir(join(tempDir, 'my-skill'), { recursive: true })
    })

    afterEach(async () => {
        await removeTempDir(tempDir)
    })

    it('has correct name', () => {
        expect(new ReadSkillResourceTool(makeSkillRegistryMock(), new MarkdownSkillRepository(tempDir)).name).toBe(
            'skill_resource_read'
        )
    })

    it('throws AgentToolError when the skill is not registered', async () => {
        const tool = new ReadSkillResourceTool(makeSkillRegistryMock(), new MarkdownSkillRepository(tempDir))
        await expect(
            tool.execute({ skillName: 'ghost', relativePath: 'notes.md' }, 'caller', 'session-1')
        ).rejects.toThrow(AgentToolError)
    })

    it('reads the content of a resource file', async () => {
        await writeFile(join(tempDir, 'my-skill', 'notes.md'), 'resource content', 'utf-8')
        const tool = new ReadSkillResourceTool(
            makeSkillRegistryMock([makeSkill()]),
            new MarkdownSkillRepository(tempDir)
        )
        const result = await tool.execute({ skillName: 'my-skill', relativePath: 'notes.md' }, 'caller', 'session-1')
        expect(result).toBe('resource content')
    })

    it('reads a nested resource file', async () => {
        await mkdir(join(tempDir, 'my-skill', 'examples'))
        await writeFile(join(tempDir, 'my-skill', 'examples', 'usage.ts'), 'nested content', 'utf-8')
        const tool = new ReadSkillResourceTool(
            makeSkillRegistryMock([makeSkill()]),
            new MarkdownSkillRepository(tempDir)
        )
        const result = await tool.execute(
            { skillName: 'my-skill', relativePath: 'examples/usage.ts' },
            'caller',
            'session-1'
        )
        expect(result).toBe('nested content')
    })

    it('throws AgentToolError when the resource file does not exist', async () => {
        const tool = new ReadSkillResourceTool(
            makeSkillRegistryMock([makeSkill()]),
            new MarkdownSkillRepository(tempDir)
        )
        await expect(
            tool.execute({ skillName: 'my-skill', relativePath: 'missing.md' }, 'caller', 'session-1')
        ).rejects.toThrow(AgentToolError)
    })

    it('throws AgentToolError for a path that escapes the skill directory', async () => {
        const tool = new ReadSkillResourceTool(
            makeSkillRegistryMock([makeSkill()]),
            new MarkdownSkillRepository(tempDir)
        )
        await expect(
            tool.execute({ skillName: 'my-skill', relativePath: '../escape.md' }, 'caller', 'session-1')
        ).rejects.toThrow(AgentToolError)
    })

    it('throws AgentToolError for invalid schema (empty relativePath)', async () => {
        const tool = new ReadSkillResourceTool(
            makeSkillRegistryMock([makeSkill()]),
            new MarkdownSkillRepository(tempDir)
        )
        await expect(tool.execute({ skillName: 'my-skill', relativePath: '' }, 'caller', 'session-1')).rejects.toThrow(
            AgentToolError
        )
    })

    it('throws AgentToolError with a clear message for a binary resource', async () => {
        await writeFile(join(tempDir, 'my-skill', 'logo.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x01]))
        const tool = new ReadSkillResourceTool(
            makeSkillRegistryMock([makeSkill()]),
            new MarkdownSkillRepository(tempDir)
        )
        await expect(
            tool.execute({ skillName: 'my-skill', relativePath: 'logo.png' }, 'caller', 'session-1')
        ).rejects.toThrow(/binary/)
    })
})
