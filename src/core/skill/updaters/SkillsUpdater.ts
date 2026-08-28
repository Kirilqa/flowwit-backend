import path from 'path'
import { stableStringify } from '@core/utils'
import { WatcherEventUpdaterInterface, WatcherEvent, WATCHER_EVENT_TYPE } from '@core/watcher'
import { SkillRegistryInterface, SkillRepositoryInterface } from '../interfaces'
import { AgentRegistryInterface } from '@agent'

export class SkillsUpdater implements WatcherEventUpdaterInterface {
    private readonly fingerprints = new Map<string, string>()

    constructor(
        private readonly skillRepository: SkillRepositoryInterface,
        private readonly skillRegistry: SkillRegistryInterface,
        private readonly agentRegistry: AgentRegistryInterface
    ) {}

    async handle(event: WatcherEvent): Promise<void> {
        const normalizedPath = event.path.replace(/\\/g, '/')

        if (event.type === WATCHER_EVENT_TYPE.ADD || event.type === WATCHER_EVENT_TYPE.CHANGE) {
            await this.handleUpsert(normalizedPath)
            return
        }

        await this.handleUnlink(normalizedPath)
    }

    private async handleUpsert(filePath: string): Promise<void> {
        const skillName = path.posix.basename(path.posix.dirname(filePath))
        const skill = await this.skillRepository.findById(skillName)

        if (skill === null) {
            return
        }

        const fingerprint = stableStringify(skill)

        if (this.fingerprints.get(skill.name) === fingerprint) {
            return
        }

        this.skillRegistry.register(skill.name, skill)
        this.fingerprints.set(skill.name, fingerprint)

        for (const agent of this.agentRegistry.list()) {
            const agentSkills = agent.config.skills ?? []
            const hasSkill = agentSkills.some(agentSkill => agentSkill.name === skill.name)

            if (!hasSkill) {
                continue
            }

            const updatedSkills = agentSkills.map(agentSkill => (agentSkill.name === skill.name ? skill : agentSkill))

            agent.update({ skills: updatedSkills })
        }
    }

    private async handleUnlink(filePath: string): Promise<void> {
        if (path.posix.basename(filePath) !== 'SKILL.md') {
            return
        }

        const skillName = path.posix.basename(path.posix.dirname(filePath))
        const skill = this.skillRegistry.get(skillName)

        if (skill === null) {
            return
        }

        this.skillRegistry.unregister(skill.name)
        this.fingerprints.delete(skill.name)

        for (const agent of this.agentRegistry.list()) {
            const agentSkills = agent.config.skills ?? []

            if (!agentSkills.some(s => s.name === skill.name)) {
                continue
            }

            agent.update({ skills: agentSkills.filter(s => s.name !== skill.name) })
        }
    }
}
