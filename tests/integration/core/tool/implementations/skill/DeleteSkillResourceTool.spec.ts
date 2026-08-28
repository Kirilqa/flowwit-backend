import { writeFile, mkdir, stat } from 'fs/promises'
import { join } from 'path'
import { DeleteSkillResourceTool } from '@tool/implementations/skill/DeleteSkillResourceTool'
import { AgentToolError } from '@tool/errors'
import { MarkdownSkillRepository, Skill } from '@skill'
import { makeSkillMock, makeSkillRegistryMock } from '../../../../../helpers/makeAgent'
import { makeTempDir, removeTempDir } from '../../../../../helpers/tempDir'

function makeSkill(): Skill {
    return makeSkillMock({ name: 'my-skill', resources: ['notes.md'] })
}

describe('DeleteSkillResourceTool', () => {
    let tempDir: string

    beforeEach(async () => {
        tempDir = await makeTempDir('skill-resource-test')
        await mkdir(join(tempDir, 'my-skill'), { recursive: true })
    })

    afterEach(async () => {
        await removeTempDir(tempDir)
    })

    it('has correct name', () => {
        expect(new DeleteSkillResourceTool(makeSkillRegistryMock(), new MarkdownSkillRepository(tempDir)).name).toBe(
            'skill_resource_delete'
        )
    })

    it('throws AgentToolError when the skill is not registered', async () => {
        const tool = new DeleteSkillResourceTool(makeSkillRegistryMock(), new MarkdownSkillRepository(tempDir))
        await expect(
            tool.execute({ skillName: 'ghost', relativePath: 'notes.md' }, 'caller', 'session-1')
        ).rejects.toThrow(AgentToolError)
    })

    it('deletes a resource file inside the skill directory', async () => {
        const filePath = join(tempDir, 'my-skill', 'notes.md')
        await writeFile(filePath, 'content', 'utf-8')

        const tool = new DeleteSkillResourceTool(
            makeSkillRegistryMock([makeSkill()]),
            new MarkdownSkillRepository(tempDir)
        )
        await tool.execute({ skillName: 'my-skill', relativePath: 'notes.md' }, 'caller', 'session-1')

        await expect(stat(filePath)).rejects.toThrow()
    })

    it('deletes a nested resource file', async () => {
        await mkdir(join(tempDir, 'my-skill', 'examples'))
        const filePath = join(tempDir, 'my-skill', 'examples', 'usage.ts')
        await writeFile(filePath, 'content', 'utf-8')

        const tool = new DeleteSkillResourceTool(
            makeSkillRegistryMock([makeSkill()]),
            new MarkdownSkillRepository(tempDir)
        )
        await tool.execute({ skillName: 'my-skill', relativePath: 'examples/usage.ts' }, 'caller', 'session-1')

        await expect(stat(filePath)).rejects.toThrow()
    })

    it('returns a success message containing the relative path', async () => {
        await writeFile(join(tempDir, 'my-skill', 'notes.md'), 'content', 'utf-8')
        const tool = new DeleteSkillResourceTool(
            makeSkillRegistryMock([makeSkill()]),
            new MarkdownSkillRepository(tempDir)
        )
        const result = await tool.execute({ skillName: 'my-skill', relativePath: 'notes.md' }, 'caller', 'session-1')
        expect(result).toContain('notes.md')
    })

    it('throws AgentToolError when the resource file does not exist', async () => {
        const tool = new DeleteSkillResourceTool(
            makeSkillRegistryMock([makeSkill()]),
            new MarkdownSkillRepository(tempDir)
        )
        await expect(
            tool.execute({ skillName: 'my-skill', relativePath: 'missing.md' }, 'caller', 'session-1')
        ).rejects.toThrow(AgentToolError)
    })

    it('throws AgentToolError when attempting to delete SKILL.md', async () => {
        await writeFile(join(tempDir, 'my-skill', 'SKILL.md'), '# Skill', 'utf-8')
        const tool = new DeleteSkillResourceTool(
            makeSkillRegistryMock([makeSkill()]),
            new MarkdownSkillRepository(tempDir)
        )
        await expect(
            tool.execute({ skillName: 'my-skill', relativePath: 'SKILL.md' }, 'caller', 'session-1')
        ).rejects.toThrow(AgentToolError)
    })

    it('throws AgentToolError for a path that escapes the skill directory', async () => {
        const tool = new DeleteSkillResourceTool(
            makeSkillRegistryMock([makeSkill()]),
            new MarkdownSkillRepository(tempDir)
        )
        await expect(
            tool.execute({ skillName: 'my-skill', relativePath: '../escape.md' }, 'caller', 'session-1')
        ).rejects.toThrow(AgentToolError)
    })
})
