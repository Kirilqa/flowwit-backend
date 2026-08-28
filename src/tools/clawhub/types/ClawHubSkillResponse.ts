import { ClawHubModeration } from './ClawHubModeration'
import { ClawHubOwner } from './ClawHubOwner'
import { ClawHubSkillMetadata } from './ClawHubSkillMetadata'
import { ClawHubSkillResponseSkill } from './ClawHubSkillResponseSkill'
import { ClawHubSkillVersion } from './ClawHubSkillVersion'

export type ClawHubSkillResponse = {
    skill: ClawHubSkillResponseSkill
    latestVersion: ClawHubSkillVersion
    metadata: ClawHubSkillMetadata | null
    owner: ClawHubOwner
    moderation: ClawHubModeration | null
}
