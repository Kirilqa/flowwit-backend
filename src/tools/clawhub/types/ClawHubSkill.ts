import { ClawHubModeration } from './ClawHubModeration'
import { ClawHubOwner } from './ClawHubOwner'
import { ClawHubSkillMetadata } from './ClawHubSkillMetadata'
import { ClawHubSkillVersion } from './ClawHubSkillVersion'

export type ClawHubSkill = {
    slug: string
    displayName: string
    summary: string
    tags: Record<string, string>
    stats: Record<string, unknown>
    createdAt: number
    updatedAt: number
    latestVersion: ClawHubSkillVersion
    metadata: ClawHubSkillMetadata | null
    owner: ClawHubOwner
    moderation: ClawHubModeration | null
}
