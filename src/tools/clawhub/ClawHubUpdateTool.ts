import { z } from 'zod'
import { AgentToolError, SkillSummary } from '@tool'
import { BaseClawHubSkillInstallerTool } from './BaseClawHubSkillInstallerTool'
import { clawHubUpdateToolSchema } from './validators'

export class ClawHubUpdateTool extends BaseClawHubSkillInstallerTool<typeof clawHubUpdateToolSchema> {
    readonly name = 'clawhub_update'
    readonly description =
        'Updates an already installed ClawHub skill to a newer version. The skill must already be installed — use clawhub_install for new skills. Checks moderation status and runs a safety inspection before updating.'
    readonly schema = clawHubUpdateToolSchema

    protected async run(args: z.infer<typeof clawHubUpdateToolSchema>): Promise<SkillSummary> {
        await this.checkModeration(args.slug)

        const archive = await this.downloadAndExtract(args.slug, args.version)

        if (!this.skillRegistry.has(archive.skillName)) {
            throw new AgentToolError(
                `Skill "${archive.skillName}" is not installed. Use clawhub_install to install it first.`
            )
        }

        await this.runSafetyInspection(args.slug, args.version, archive.inspectableFiles)

        await this.skillRepository.update(archive.skillName, { ...archive.skill })
        await this.writeResources(archive.skillName, archive.files)

        const skill = await this.skillRepository.findById(archive.skillName)

        if (skill === null) {
            throw new AgentToolError(`Skill "${archive.skillName}" was updated but could not be loaded from disk.`)
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
