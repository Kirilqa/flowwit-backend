import { SKILL_SAFETY_ACTION, SkillSafetyInspectorInterface } from '../inspector'
import { SkillRepositoryInterface } from '../interfaces'
import { Skill, SkillSeed } from '../types'

const SCRIPTS_PREFIX = 'scripts/'

export class SafetyCheckedSkillRepository implements SkillRepositoryInterface {
    constructor(
        private readonly repository: SkillRepositoryInterface,
        private readonly safetyInspector: SkillSafetyInspectorInterface
    ) {}

    ensureInitialized(seed: Array<SkillSeed>): Promise<void> {
        return this.repository.ensureInitialized(seed)
    }

    findAll(): Promise<Array<Skill>> {
        return this.repository.findAll()
    }

    findById(name: string): Promise<Skill | null> {
        return this.repository.findById(name)
    }

    create(skill: Skill): Promise<Skill> {
        return this.repository.create(skill)
    }

    update(name: string, patch: Partial<Skill>): Promise<Skill> {
        return this.repository.update(name, patch)
    }

    delete(name: string): Promise<void> {
        return this.repository.delete(name)
    }

    async writeResource(skillName: string, relativePath: string, content: Buffer): Promise<void> {
        const normalizedPath = relativePath.replace(/\\/g, '/')

        if (normalizedPath.startsWith(SCRIPTS_PREFIX)) {
            const inspectionResult = await this.safetyInspector.inspect({
                slug: skillName,
                scan: null,
                files: { [normalizedPath]: content.toString('utf-8') }
            })

            if (inspectionResult.action === SKILL_SAFETY_ACTION.BLOCK) {
                throw new Error(
                    `Resource "${relativePath}" in skill "${skillName}" blocked by safety inspector: ${inspectionResult.reason}`
                )
            }
        }

        return this.repository.writeResource(skillName, relativePath, content)
    }

    readResource(skillName: string, relativePath: string): Promise<Buffer> {
        return this.repository.readResource(skillName, relativePath)
    }

    deleteResource(skillName: string, relativePath: string): Promise<void> {
        return this.repository.deleteResource(skillName, relativePath)
    }

    resolveExecutablePath(skillName: string, relativePath: string): Promise<string> {
        return this.repository.resolveExecutablePath(skillName, relativePath)
    }
}
