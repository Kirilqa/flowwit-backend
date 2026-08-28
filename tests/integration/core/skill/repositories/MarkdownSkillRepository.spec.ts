import { dirname, join } from 'path'
import { mkdir, writeFile } from 'fs/promises'
import { MarkdownSkillRepository } from '@skill/repositories/MarkdownSkillRepository'
import { makeTempDir, removeTempDir } from '../../../../helpers/tempDir'

function skillFile(name: string, description: string, content = 'Skill content.', extras = ''): string {
    return `---\nname: ${name}\ndescription: ${description}${extras}\n---\n\n${content}\n`
}

async function createSkillDir(
    parentDir: string,
    dirName: string,
    markdownContent: string,
    extraFiles: Record<string, string> = {}
): Promise<void> {
    const skillDir = join(parentDir, dirName)
    await mkdir(skillDir, { recursive: true })
    await writeFile(join(skillDir, 'SKILL.md'), markdownContent, 'utf-8')
    for (const [fileName, fileContent] of Object.entries(extraFiles)) {
        const filePath = join(skillDir, fileName)
        await mkdir(dirname(filePath), { recursive: true })
        await writeFile(filePath, fileContent, 'utf-8')
    }
}

describe('MarkdownSkillRepository (integration)', () => {
    let testDir: string
    let repository: MarkdownSkillRepository

    beforeEach(async () => {
        testDir = await makeTempDir('skill-repo-test')
        repository = new MarkdownSkillRepository(testDir)
    })

    afterEach(async () => {
        await removeTempDir(testDir)
    })

    describe('findAll()', () => {
        it('returns empty array when no subdirectories exist', async () => {
            expect(await repository.findAll()).toEqual([])
        })

        it('returns empty array when the skills directory does not exist yet', async () => {
            const missingDirRepository = new MarkdownSkillRepository(join(testDir, 'does-not-exist'))
            expect(await missingDirRepository.findAll()).toEqual([])
        })

        it('returns skills from all valid skill directories', async () => {
            await createSkillDir(testDir, 'skill-a', skillFile('skill-a', 'Skill A'))
            await createSkillDir(testDir, 'skill-b', skillFile('skill-b', 'Skill B'))

            const skills = await repository.findAll()
            expect(skills).toHaveLength(2)
        })

        it('skips .git directory', async () => {
            await createSkillDir(testDir, 'real-skill', skillFile('real-skill', 'Real'))
            await mkdir(join(testDir, '.git'), { recursive: true })

            const skills = await repository.findAll()
            expect(skills).toHaveLength(1)
        })

        it('skips node_modules directory', async () => {
            await createSkillDir(testDir, 'real-skill', skillFile('real-skill', 'Real'))
            await mkdir(join(testDir, 'node_modules'), { recursive: true })

            const skills = await repository.findAll()
            expect(skills).toHaveLength(1)
        })

        it('skips directories without a SKILL.md file', async () => {
            await createSkillDir(testDir, 'valid-skill', skillFile('valid-skill', 'Valid'))
            await mkdir(join(testDir, 'no-skill-file'), { recursive: true })

            const skills = await repository.findAll()
            expect(skills).toHaveLength(1)
        })

        it('returns skill names from SKILL.md frontmatter', async () => {
            await createSkillDir(testDir, 'my-skill', skillFile('my-skill', 'Test description'))

            const skills = await repository.findAll()
            const names = skills.map(s => s.name)
            expect(names).toContain('my-skill')
        })
    })

    describe('findById()', () => {
        it('returns null for a non-existent skill directory', async () => {
            expect(await repository.findById('missing-skill')).toBeNull()
        })

        it('returns the skill with correct name and description', async () => {
            await createSkillDir(testDir, 'target', skillFile('target', 'Target description', 'Do something.'))

            const skill = await repository.findById('target')
            expect(skill?.name).toBe('target')
            expect(skill?.description).toBe('Target description')
        })

        it('returns the skill content (body after frontmatter)', async () => {
            await createSkillDir(testDir, 'content-skill', skillFile('content-skill', 'Desc', 'The actual content.'))

            const skill = await repository.findById('content-skill')
            expect(skill?.content).toBe('The actual content.')
        })

        it('includes directory path in the skill', async () => {
            await createSkillDir(testDir, 'dir-skill', skillFile('dir-skill', 'Desc'))

            const skill = await repository.findById('dir-skill')
            expect(skill?.directory).toContain('dir-skill')
        })

        it('discovers resource files in the skill directory', async () => {
            await createSkillDir(testDir, 'res-skill', skillFile('res-skill', 'Desc'), {
                'example.ts': 'const x = 1',
                'prompt.txt': 'prompt text'
            })

            const skill = await repository.findById('res-skill')
            expect(skill?.resources).toHaveLength(2)
        })

        it('discovers resource files nested inside subdirectories', async () => {
            await createSkillDir(testDir, 'nested-res-skill', skillFile('nested-res-skill', 'Desc'))
            await mkdir(join(testDir, 'nested-res-skill', 'examples'), { recursive: true })
            await writeFile(join(testDir, 'nested-res-skill', 'examples', 'usage.ts'), 'const x = 1', 'utf-8')

            const skill = await repository.findById('nested-res-skill')
            expect(skill?.resources).toContain(join('examples', 'usage.ts'))
        })

        it('parses optional license field', async () => {
            await createSkillDir(testDir, 'licensed', skillFile('licensed', 'Desc', 'Content.', '\nlicense: MIT'))

            const skill = await repository.findById('licensed')
            expect(skill?.license).toBe('MIT')
        })

        it('parses optional allowed-tools field', async () => {
            const md = skillFile('tooled', 'Desc', 'Content.', '\nallowed-tools: Bash Read Write')
            await createSkillDir(testDir, 'tooled', md)

            const skill = await repository.findById('tooled')
            expect(skill?.allowedTools).toEqual(['Bash', 'Read', 'Write'])
        })

        it('parses optional compatibility field', async () => {
            const md = skillFile('compat', 'Desc', 'Content.', '\ncompatibility: claude-sonnet-4-6')
            await createSkillDir(testDir, 'compat', md)

            const skill = await repository.findById('compat')
            expect(skill?.compatibility).toBe('claude-sonnet-4-6')
        })

        it('parses optional metadata object field', async () => {
            const md = `---\nname: meta-skill\ndescription: Desc\nmetadata:\n  version: 2\n  author: test\n---\n\nContent.\n`
            await createSkillDir(testDir, 'meta-skill', md)

            const skill = await repository.findById('meta-skill')
            expect(skill?.metadata?.['version']).toBe(2)
            expect(skill?.metadata?.['author']).toBe('test')
        })

        it('returns null when SKILL.md is missing required name field', async () => {
            const md = `---\ndescription: No name here\n---\n\nContent.\n`
            await createSkillDir(testDir, 'no-name', md)

            expect(await repository.findById('no-name')).toBeNull()
        })

        it('returns null when SKILL.md is missing required description field', async () => {
            const md = `---\nname: no-desc\n---\n\nContent.\n`
            await createSkillDir(testDir, 'no-desc', md)

            expect(await repository.findById('no-desc')).toBeNull()
        })

        it('returns null when file has no frontmatter delimiters', async () => {
            const md = 'Just plain content without frontmatter.'
            await createSkillDir(testDir, 'no-frontmatter', md)

            expect(await repository.findById('no-frontmatter')).toBeNull()
        })

        it('returns null when frontmatter is opened but never closed', async () => {
            const md = '---\nname: unclosed\ndescription: Unclosed frontmatter\n\nContent without closing delimiter.'
            await createSkillDir(testDir, 'unclosed', md)

            expect(await repository.findById('unclosed')).toBeNull()
        })

        it('returns null when frontmatter parses to a non-object (e.g. a YAML list)', async () => {
            const md = '---\n- item one\n- item two\n---\n\nContent.\n'
            await createSkillDir(testDir, 'list-frontmatter', md)

            expect(await repository.findById('list-frontmatter')).toBeNull()
        })

        it('recovers via sanitized re-parsing when a value contains an unquoted colon', async () => {
            const md = '---\nname: colon-skill\ndescription: Contains: a colon\n---\n\nContent.\n'
            await createSkillDir(testDir, 'colon-skill', md)

            const skill = await repository.findById('colon-skill')
            expect(skill?.name).toBe('colon-skill')
            expect(skill?.description).toContain('a colon')
        })

        it('returns null when frontmatter fails to parse even after sanitization', async () => {
            const md = '---\n\tname: tab-indented\n\tdescription: invalid\n---\n\nContent.\n'
            await createSkillDir(testDir, 'tab-frontmatter', md)

            expect(await repository.findById('tab-frontmatter')).toBeNull()
        })
    })

    describe('create()', () => {
        it('creates the skill directory and SKILL.md file', async () => {
            const skill = {
                name: 'new-skill',
                description: 'A new skill',
                content: 'Do things.',
                directory: '',
                resources: []
            }

            await repository.create(skill)
            const found = await repository.findById('new-skill')
            expect(found).not.toBeNull()
        })

        it('sets skill.directory to the created path', async () => {
            const skill = {
                name: 'dir-set',
                description: 'Desc',
                content: 'Content.',
                directory: '',
                resources: []
            }

            const result = await repository.create(skill)
            expect(result.directory).toContain('dir-set')
        })

        it('round-trips name and description through serialization', async () => {
            const skill = {
                name: 'round-trip',
                description: 'Round trip description',
                content: 'Body text.',
                directory: '',
                resources: []
            }

            await repository.create(skill)
            const found = await repository.findById('round-trip')
            expect(found?.name).toBe('round-trip')
            expect(found?.description).toBe('Round trip description')
            expect(found?.content).toBe('Body text.')
        })

        it('round-trips optional fields', async () => {
            const skill = {
                name: 'optionals',
                description: 'With optionals',
                content: 'Content.',
                directory: '',
                resources: [],
                license: 'Apache-2.0',
                allowedTools: ['Read', 'Bash']
            }

            await repository.create(skill)
            const found = await repository.findById('optionals')
            expect(found?.license).toBe('Apache-2.0')
            expect(found?.allowedTools).toEqual(['Read', 'Bash'])
        })

        it('round-trips the compatibility field', async () => {
            const skill = {
                name: 'compat-skill',
                description: 'With compatibility',
                content: 'Content.',
                directory: '',
                resources: [],
                compatibility: 'claude-sonnet-4-6'
            }

            await repository.create(skill)
            const found = await repository.findById('compat-skill')
            expect(found?.compatibility).toBe('claude-sonnet-4-6')
        })
    })

    describe('update()', () => {
        it('overwrites the SKILL.md with updated fields', async () => {
            await createSkillDir(testDir, 'updatable', skillFile('updatable', 'Old description'))

            await repository.update('updatable', { description: 'New description' })
            const found = await repository.findById('updatable')
            expect(found?.description).toBe('New description')
        })

        it('throws when the skill does not exist', async () => {
            await expect(repository.update('nonexistent', { description: 'x' })).rejects.toThrow()
        })
    })

    describe('delete()', () => {
        it('removes the SKILL.md file so findById returns null', async () => {
            await createSkillDir(testDir, 'deletable', skillFile('deletable', 'Desc'))

            await repository.delete('deletable')
            expect(await repository.findById('deletable')).toBeNull()
        })

        it('excluded deleted skill from findAll results', async () => {
            await createSkillDir(testDir, 'keep', skillFile('keep', 'Keep'))
            await createSkillDir(testDir, 'remove', skillFile('remove', 'Remove'))

            await repository.delete('remove')
            const skills = await repository.findAll()
            expect(skills).toHaveLength(1)
            expect(skills[0]?.name).toBe('keep')
        })
    })

    describe('writeResource()', () => {
        it('writes a resource file inside the skill directory', async () => {
            await createSkillDir(testDir, 'res-write', skillFile('res-write', 'Desc'))

            await repository.writeResource('res-write', 'notes.md', Buffer.from('hello'))

            const skill = await repository.findById('res-write')
            expect(skill?.resources).toContain('notes.md')
        })

        it('creates missing parent directories for a nested resource', async () => {
            await createSkillDir(testDir, 'res-nested', skillFile('res-nested', 'Desc'))

            await repository.writeResource('res-nested', 'examples/usage.ts', Buffer.from('nested'))

            const skill = await repository.findById('res-nested')
            expect(skill?.resources).toContain(join('examples', 'usage.ts'))
        })

        it('overwrites an existing resource file', async () => {
            await createSkillDir(testDir, 'res-overwrite', skillFile('res-overwrite', 'Desc'))

            await repository.writeResource('res-overwrite', 'notes.md', Buffer.from('first'))
            await repository.writeResource('res-overwrite', 'notes.md', Buffer.from('second'))

            const content = await repository.readResource('res-overwrite', 'notes.md')
            expect(content.toString('utf-8')).toBe('second')
        })

        it('throws for a path that escapes the skill directory', async () => {
            await createSkillDir(testDir, 'res-escape', skillFile('res-escape', 'Desc'))

            await expect(repository.writeResource('res-escape', '../escape.md', Buffer.from('x'))).rejects.toThrow()
        })

        it('throws when attempting to write SKILL.md as a resource', async () => {
            await createSkillDir(testDir, 'res-skillmd', skillFile('res-skillmd', 'Desc'))

            await expect(repository.writeResource('res-skillmd', 'SKILL.md', Buffer.from('x'))).rejects.toThrow()
        })
    })

    describe('readResource()', () => {
        it('reads the content of a resource file', async () => {
            await createSkillDir(testDir, 'res-read', skillFile('res-read', 'Desc'), { 'notes.md': 'content' })

            const content = await repository.readResource('res-read', 'notes.md')
            expect(content.toString('utf-8')).toBe('content')
        })

        it('throws when the resource file does not exist', async () => {
            await createSkillDir(testDir, 'res-read-missing', skillFile('res-read-missing', 'Desc'))

            await expect(repository.readResource('res-read-missing', 'missing.md')).rejects.toThrow()
        })

        it('throws for a path that escapes the skill directory', async () => {
            await createSkillDir(testDir, 'res-read-escape', skillFile('res-read-escape', 'Desc'))

            await expect(repository.readResource('res-read-escape', '../escape.md')).rejects.toThrow()
        })
    })

    describe('deleteResource()', () => {
        it('deletes a resource file inside the skill directory', async () => {
            await createSkillDir(testDir, 'res-delete', skillFile('res-delete', 'Desc'), { 'notes.md': 'content' })

            await repository.deleteResource('res-delete', 'notes.md')

            const skill = await repository.findById('res-delete')
            expect(skill?.resources).not.toContain('notes.md')
        })

        it('throws when the resource file does not exist', async () => {
            await createSkillDir(testDir, 'res-delete-missing', skillFile('res-delete-missing', 'Desc'))

            await expect(repository.deleteResource('res-delete-missing', 'missing.md')).rejects.toThrow()
        })

        it('throws when attempting to delete SKILL.md', async () => {
            await createSkillDir(testDir, 'res-delete-skillmd', skillFile('res-delete-skillmd', 'Desc'))

            await expect(repository.deleteResource('res-delete-skillmd', 'SKILL.md')).rejects.toThrow()
        })

        it('throws for a path that escapes the skill directory', async () => {
            await createSkillDir(testDir, 'res-delete-escape', skillFile('res-delete-escape', 'Desc'))

            await expect(repository.deleteResource('res-delete-escape', '../escape.md')).rejects.toThrow()
        })
    })

    describe('resolveExecutablePath()', () => {
        it('returns the absolute path of an existing resource', async () => {
            await createSkillDir(testDir, 'res-exec', skillFile('res-exec', 'Desc'), {
                'scripts/build.py': 'print("hi")'
            })

            const path = await repository.resolveExecutablePath('res-exec', 'scripts/build.py')
            expect(path).toContain(join('scripts', 'build.py'))
        })

        it('throws when the resource does not exist', async () => {
            await createSkillDir(testDir, 'res-exec-missing', skillFile('res-exec-missing', 'Desc'))

            await expect(repository.resolveExecutablePath('res-exec-missing', 'scripts/missing.py')).rejects.toThrow()
        })

        it('throws for a path that escapes the skill directory', async () => {
            await createSkillDir(testDir, 'res-exec-escape', skillFile('res-exec-escape', 'Desc'))

            await expect(repository.resolveExecutablePath('res-exec-escape', '../escape.py')).rejects.toThrow()
        })
    })

    describe('ensureInitialized()', () => {
        it('seeds the given skills when the repository is empty', async () => {
            await repository.ensureInitialized([
                { skill: { name: 'seed-skill', description: 'A seeded skill', content: 'Do the thing.' } }
            ])

            const skill = await repository.findById('seed-skill')
            expect(skill?.description).toBe('A seeded skill')
            expect(skill?.content).toBe('Do the thing.')
        })

        it('seeds bundled resources alongside the skill', async () => {
            await repository.ensureInitialized([
                {
                    skill: { name: 'seed-with-resource', description: 'Desc', content: 'Content.' },
                    resources: { 'NODES.md': '# Node reference' }
                }
            ])

            const skill = await repository.findById('seed-with-resource')
            expect(skill?.resources).toContain('NODES.md')

            const content = await repository.readResource('seed-with-resource', 'NODES.md')
            expect(content.toString('utf-8')).toBe('# Node reference')
        })

        it('does nothing when at least one skill already exists', async () => {
            await createSkillDir(testDir, 'existing', skillFile('existing', 'Already here'))

            await repository.ensureInitialized([
                { skill: { name: 'seed-skill', description: 'Should not appear', content: 'x' } }
            ])

            const skills = await repository.findAll()
            expect(skills.map(s => s.name)).toEqual(['existing'])
        })

        it('creates the skills directory even when the seed list is empty', async () => {
            await repository.ensureInitialized([])
            expect(await repository.findAll()).toEqual([])
        })
    })
})
