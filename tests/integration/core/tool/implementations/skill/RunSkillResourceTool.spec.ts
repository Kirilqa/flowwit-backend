import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { RunSkillResourceTool } from '@tool/implementations/skill/RunSkillResourceTool'
import { AgentToolError } from '@tool/errors'
import { ShellResult } from '@tool/implementations/shell/types'
import { MarkdownSkillRepository, Skill } from '@skill'
import { makeSkillMock, makeSkillRegistryMock } from '../../../../../helpers/makeAgent'
import { makeTempDir, removeTempDir } from '../../../../../helpers/tempDir'

function makeSkill(directory: string): Skill {
    return makeSkillMock({ name: 'my-skill', directory, resources: ['scripts/run.js'] })
}

async function run(tool: RunSkillResourceTool, args: Record<string, unknown>): Promise<ShellResult> {
    return (await tool.execute(args, 'caller', 'session-1')) as ShellResult
}

describe('RunSkillResourceTool', () => {
    let tempDir: string
    let skillDir: string

    beforeEach(async () => {
        tempDir = await makeTempDir('skill-run-test')
        skillDir = join(tempDir, 'my-skill')
        await mkdir(join(skillDir, 'scripts'), { recursive: true })
    })

    afterEach(async () => {
        await removeTempDir(tempDir)
    })

    it('has correct name', () => {
        expect(new RunSkillResourceTool(makeSkillRegistryMock(), new MarkdownSkillRepository(tempDir)).name).toBe(
            'skill_resource_run'
        )
    })

    it('throws AgentToolError when the skill is not registered', async () => {
        const tool = new RunSkillResourceTool(makeSkillRegistryMock(), new MarkdownSkillRepository(tempDir))
        await expect(
            tool.execute({ skillName: 'ghost', relativePath: 'scripts/run.js' }, 'caller', 'session-1')
        ).rejects.toThrow(AgentToolError)
    })

    it('runs a bundled script and returns its stdout', async () => {
        await writeFile(join(skillDir, 'scripts', 'run.js'), 'console.log("hello from script")', 'utf-8')
        const tool = new RunSkillResourceTool(
            makeSkillRegistryMock([makeSkill(skillDir)]),
            new MarkdownSkillRepository(tempDir)
        )
        const result = await run(tool, { skillName: 'my-skill', relativePath: 'scripts/run.js' })
        expect(result.stdout).toContain('hello from script')
        expect(result.exitCode).toBe(0)
    })

    it('passes args through to the script', async () => {
        await writeFile(join(skillDir, 'scripts', 'run.js'), 'console.log(process.argv.slice(2).join(","))', 'utf-8')
        const tool = new RunSkillResourceTool(
            makeSkillRegistryMock([makeSkill(skillDir)]),
            new MarkdownSkillRepository(tempDir)
        )
        const result = await run(tool, { skillName: 'my-skill', relativePath: 'scripts/run.js', args: ['foo', 'bar'] })
        expect(result.stdout).toContain('foo,bar')
    })

    it('throws AgentToolError when the script exits non-zero', async () => {
        await writeFile(join(skillDir, 'scripts', 'run.js'), 'process.exit(1)', 'utf-8')
        const tool = new RunSkillResourceTool(
            makeSkillRegistryMock([makeSkill(skillDir)]),
            new MarkdownSkillRepository(tempDir)
        )
        await expect(
            tool.execute({ skillName: 'my-skill', relativePath: 'scripts/run.js' }, 'caller', 'session-1')
        ).rejects.toThrow(AgentToolError)
    })

    it('throws AgentToolError for a path not under scripts/', async () => {
        await writeFile(join(skillDir, 'notes.md'), 'not a script', 'utf-8')
        const tool = new RunSkillResourceTool(
            makeSkillRegistryMock([makeSkillMock({ name: 'my-skill', directory: skillDir, resources: ['notes.md'] })]),
            new MarkdownSkillRepository(tempDir)
        )
        await expect(
            tool.execute({ skillName: 'my-skill', relativePath: 'notes.md' }, 'caller', 'session-1')
        ).rejects.toThrow(/scripts\//)
    })

    it('throws AgentToolError for an unsupported extension', async () => {
        await writeFile(join(skillDir, 'scripts', 'run.rb'), 'puts "hi"', 'utf-8')
        const tool = new RunSkillResourceTool(
            makeSkillRegistryMock([makeSkill(skillDir)]),
            new MarkdownSkillRepository(tempDir)
        )
        await expect(
            tool.execute({ skillName: 'my-skill', relativePath: 'scripts/run.rb' }, 'caller', 'session-1')
        ).rejects.toThrow(/not supported/)
    })

    it('throws AgentToolError when the script does not exist', async () => {
        const tool = new RunSkillResourceTool(
            makeSkillRegistryMock([makeSkill(skillDir)]),
            new MarkdownSkillRepository(tempDir)
        )
        await expect(
            tool.execute({ skillName: 'my-skill', relativePath: 'scripts/missing.js' }, 'caller', 'session-1')
        ).rejects.toThrow(AgentToolError)
    })

    it('throws AgentToolError for a path that escapes the skill directory', async () => {
        const tool = new RunSkillResourceTool(
            makeSkillRegistryMock([makeSkill(skillDir)]),
            new MarkdownSkillRepository(tempDir)
        )
        await expect(
            tool.execute({ skillName: 'my-skill', relativePath: '../escape.js' }, 'caller', 'session-1')
        ).rejects.toThrow(AgentToolError)
    })
})
