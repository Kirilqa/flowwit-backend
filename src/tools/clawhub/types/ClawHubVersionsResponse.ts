import { ClawHubSkillVersion } from './ClawHubSkillVersion'

export type ClawHubVersionsResponse = {
    items: Array<ClawHubSkillVersion>
    nextCursor: string | null
}
