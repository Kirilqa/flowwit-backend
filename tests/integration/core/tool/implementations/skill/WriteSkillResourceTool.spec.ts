import { readFile } from 'fs/promises'
import { join } from 'path'
import { WriteSkillResourceTool } from '@tool/implementations/skill/WriteSkillResourceTool'
import { AgentToolError } from '@tool/errors'
import { MarkdownSkillRepository, Skill } from '@skill'
import { makeSkillMock, makeSkillRegistryMock } from '../../../../../helpers/makeAgent'
import { makeTempDir, removeTempDir } from '../../../../../helpers/tempDir'

function makeSkill(): Skill {
    return makeSkillMock({ name: 'my-skill' })
}

describe('WriteSkillResourceTool', () => {
    let tempDir: string

    beforeEach(async () => {
        tempDir = await makeTempDir('skill-resource-test')
    })

    afterEach(async () => {
        await removeTempDir(tempDir)
    })

    it('has correct name', () => {
        expect(new WriteSkillResourceTool(makeSkillRegistryMock(), new MarkdownSkillRepository(tempDir)).name).toBe(
            'skill_resource_write'
        )
    })

    it('throws AgentToolError when the skill is not registered', async () => {
        const tool = new WriteSkillResourceTool(makeSkillRegistryMock(), new MarkdownSkillRepository(tempDir))
        await expect(
            tool.execute({ skillName: 'ghost', relativePath: 'notes.md', content: 'x' }, 'caller', 'session-1')
        ).rejects.toThrow(AgentToolError)
    })

    it('writes a resource file inside the skill directory', async () => {
        const tool = new WriteSkillResourceTool(
            makeSkillRegistryMock([makeSkill()]),
            new MarkdownSkillRepository(tempDir)
        )
        await tool.execute({ skillName: 'my-skill', relativePath: 'notes.md', content: 'hello' }, 'caller', 'session-1')
        expect(await readFile(join(tempDir, 'my-skill', 'notes.md'), 'utf-8')).toBe('hello')
    })

    it('creates missing parent directories for a nested resource', async () => {
        const tool = new WriteSkillResourceTool(
            makeSkillRegistryMock([makeSkill()]),
            new MarkdownSkillRepository(tempDir)
        )
        await tool.execute(
            { skillName: 'my-skill', relativePath: 'examples/usage.ts', content: 'nested' },
            'caller',
            'session-1'
        )
        expect(await readFile(join(tempDir, 'my-skill', 'examples', 'usage.ts'), 'utf-8')).toBe('nested')
    })

    it('overwrites an existing resource file', async () => {
        const tool = new WriteSkillResourceTool(
            makeSkillRegistryMock([makeSkill()]),
            new MarkdownSkillRepository(tempDir)
        )
        await tool.execute({ skillName: 'my-skill', relativePath: 'notes.md', content: 'first' }, 'caller', 'session-1')
        await tool.execute(
            { skillName: 'my-skill', relativePath: 'notes.md', content: 'second' },
            'caller',
            'session-1'
        )
        expect(await readFile(join(tempDir, 'my-skill', 'notes.md'), 'utf-8')).toBe('second')
    })

    it('returns a success message containing the relative path and skill name', async () => {
        const tool = new WriteSkillResourceTool(
            makeSkillRegistryMock([makeSkill()]),
            new MarkdownSkillRepository(tempDir)
        )
        const result = await tool.execute(
            { skillName: 'my-skill', relativePath: 'notes.md', content: 'hello' },
            'caller',
            'session-1'
        )
        expect(result).toContain('notes.md')
        expect(result).toContain('my-skill')
    })

    it('throws AgentToolError for a path that escapes the skill directory', async () => {
        const tool = new WriteSkillResourceTool(
            makeSkillRegistryMock([makeSkill()]),
            new MarkdownSkillRepository(tempDir)
        )
        await expect(
            tool.execute({ skillName: 'my-skill', relativePath: '../escape.md', content: 'x' }, 'caller', 'session-1')
        ).rejects.toThrow(AgentToolError)
    })
})
