import { z } from 'zod'
import { AgentToolError, SkillSummary } from '@tool'
import { BaseClawHubSkillInstallerTool } from './BaseClawHubSkillInstallerTool'
import { clawHubInstallToolSchema } from './validators'

export class ClawHubInstallTool extends BaseClawHubSkillInstallerTool<typeof clawHubInstallToolSchema> {
    readonly name = 'clawhub_install'
    readonly description =
        'Downloads and installs a skill from ClawHub. Checks moderation status and runs a safety inspection before installing. After installation, use skill_register to make the skill available for yourself.'
    readonly schema = clawHubInstallToolSchema

    protected async run(args: z.infer<typeof clawHubInstallToolSchema>): Promise<SkillSummary> {
        await this.checkModeration(args.slug)

        const archive = await this.downloadAndExtract(args.slug, args.version)

        if (this.skillRegistry.has(archive.skillName)) {
            throw new AgentToolError(
                `Skill "${archive.skillName}" is already installed. Use clawhub_update to update it.`
            )
        }

        await this.runSafetyInspection(args.slug, args.version, archive.inspectableFiles)

        await this.skillRepository.create({ ...archive.skill, directory: '', resources: [] })
        await this.writeResources(archive.skillName, archive.files)

        const skill = await this.skillRepository.findById(archive.skillName)

        if (skill === null) {
            throw new AgentToolError(`Skill "${archive.skillName}" was installed but could not be loaded from disk.`)
        }

        this.skillRegistry.register(archive.skillName, skill)

        return {
            name: skill.name,
            description: skill.description,
            directory: skill.directory,
            resources: skill.resources
        }
    }
}
