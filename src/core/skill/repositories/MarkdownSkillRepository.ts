import { Dirent } from 'fs'
import { mkdir, readdir, readFile, stat, unlink, writeFile } from 'fs/promises'
import { join, relative, resolve } from 'path'
import { stringify as stringifyYaml } from 'yaml'
import { SkillRepositoryInterface } from '../interfaces'
import { Skill, SkillSeed } from '../types'
import { parseSkillMarkdown } from '../utils'

const SKILL_FILE_NAME = 'SKILL.md'
const FRONTMATTER_DELIMITER = '---'
const SKIP_DIRECTORIES = new Set(['.git', 'node_modules', '.agents'])

export class MarkdownSkillRepository implements SkillRepositoryInterface {
    constructor(private readonly directory: string) {}

    async ensureInitialized(seed: Array<SkillSeed>): Promise<void> {
        await mkdir(this.directory, { recursive: true })

        const existing = await this.findAll()

        if (existing.length > 0) {
            return
        }

        for (const { skill, resources } of seed) {
            await this.create({ ...skill, directory: '', resources: [] })

            for (const [relativePath, content] of Object.entries(resources ?? {})) {
                await this.writeResource(skill.name, relativePath, Buffer.from(content, 'utf-8'))
            }
        }
    }

    async findAll(): Promise<Array<Skill>> {
        let entries: Array<Dirent>

        try {
            entries = await readdir(this.directory, { withFileTypes: true })
        } catch {
            return []
        }

        const skills = await Promise.all(
            entries
                .filter(entry => entry.isDirectory() && !SKIP_DIRECTORIES.has(entry.name))
                .map(entry => this.loadFromDirectory(join(this.directory, entry.name)))
        )

        return skills.filter((skill): skill is Skill => skill !== null)
    }

    async findById(name: string): Promise<Skill | null> {
        return this.loadFromDirectory(join(this.directory, name))
    }

    async create(skill: Skill): Promise<Skill> {
        const skillDirectory = join(this.directory, skill.name)

        skill.directory = skillDirectory

        await mkdir(skillDirectory, { recursive: true })
        await writeFile(join(skillDirectory, SKILL_FILE_NAME), this.serialize(skill), 'utf-8')

        return skill
    }

    async update(name: string, patch: Partial<Skill>): Promise<Skill> {
        const existing = await this.findById(name)

        if (!existing) {
            throw new Error(`Skill "${name}" not found`)
        }

        const updated: Skill = { ...existing, ...patch, name: existing.name, directory: existing.directory }

        return this.create(updated)
    }

    async delete(name: string): Promise<void> {
        const filePath = join(this.directory, name, SKILL_FILE_NAME)
        await unlink(filePath)
    }

    async writeResource(skillName: string, relativePath: string, content: Buffer): Promise<void> {
        const absolutePath = this.resolveResourcePath(skillName, relativePath)
        await mkdir(join(absolutePath, '..'), { recursive: true })
        await writeFile(absolutePath, content)
    }

    async readResource(skillName: string, relativePath: string): Promise<Buffer> {
        const absolutePath = this.resolveResourcePath(skillName, relativePath)

        try {
            return await readFile(absolutePath)
        } catch {
            throw new Error(`Resource "${relativePath}" not found in skill "${skillName}"`)
        }
    }

    async deleteResource(skillName: string, relativePath: string): Promise<void> {
        const absolutePath = this.resolveResourcePath(skillName, relativePath)

        try {
            await unlink(absolutePath)
        } catch {
            throw new Error(`Resource "${relativePath}" not found in skill "${skillName}"`)
        }
    }

    async resolveExecutablePath(skillName: string, relativePath: string): Promise<string> {
        const absolutePath = this.resolveResourcePath(skillName, relativePath)

        try {
            await stat(absolutePath)
        } catch {
            throw new Error(`Resource "${relativePath}" not found in skill "${skillName}"`)
        }

        return absolutePath
    }

    private resolveResourcePath(skillName: string, relativePath: string): string {
        const skillDirectory = resolve(join(this.directory, skillName))
        const absolutePath = resolve(join(skillDirectory, relativePath))

        if (!absolutePath.startsWith(skillDirectory)) {
            throw new Error('Invalid path: resource path must be within the skill directory')
        }

        if (absolutePath === resolve(join(skillDirectory, SKILL_FILE_NAME))) {
            throw new Error('SKILL.md is not a resource; use the skill CRUD methods instead')
        }

        return absolutePath
    }

    private async loadFromDirectory(skillDirectory: string): Promise<Skill | null> {
        const filePath = join(skillDirectory, SKILL_FILE_NAME)

        try {
            const raw = await readFile(filePath, 'utf-8')
            const resources = await this.discoverResources(skillDirectory)
            const parsed = parseSkillMarkdown(raw)
            return { ...parsed, directory: skillDirectory, resources }
        } catch {
            return null
        }
    }

    private async discoverResources(skillDirectory: string): Promise<Array<string>> {
        const resources: Array<string> = []

        const scan = async (dir: string): Promise<void> => {
            let entries

            try {
                entries = await readdir(dir, { withFileTypes: true })
            } catch {
                return
            }

            for (const entry of entries) {
                const fullPath = join(dir, entry.name)
                const relativePath = relative(skillDirectory, fullPath)

                if (entry.isDirectory()) {
                    await scan(fullPath)
                } else if (entry.name !== SKILL_FILE_NAME) {
                    resources.push(relativePath)
                }
            }
        }

        await scan(skillDirectory)

        return resources.sort()
    }

    private serialize(skill: Skill): string {
        const frontmatter: Record<string, unknown> = {
            name: skill.name,
            description: skill.description,
            ...(skill.license !== undefined && { license: skill.license }),
            ...(skill.compatibility !== undefined && { compatibility: skill.compatibility }),
            ...(skill.allowedTools !== undefined && { 'allowed-tools': skill.allowedTools.join(' ') }),
            ...(skill.metadata !== undefined && { metadata: skill.metadata })
        }

        return `${FRONTMATTER_DELIMITER}\n${stringifyYaml(frontmatter).trim()}\n${FRONTMATTER_DELIMITER}\n\n${skill.content}\n`
    }
}
