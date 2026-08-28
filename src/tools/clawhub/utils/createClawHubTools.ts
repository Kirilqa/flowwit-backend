import { ToolInterface } from '@tool'
import { ClawHubClient } from '../ClawHubClient'
import { ClawHubSearchTool } from '../ClawHubSearchTool'
import { ClawHubSkillInfoTool } from '../ClawHubSkillInfoTool'
import { ClawHubSkillVersionsTool } from '../ClawHubSkillVersionsTool'
import { ClawHubInstallTool } from '../ClawHubInstallTool'
import { ClawHubUpdateTool } from '../ClawHubUpdateTool'
import { SkillRegistryInterface, SkillRepositoryInterface, SkillSafetyInspectorInterface } from '@skill'

export const createClawHubTools = (
    skillRepository: SkillRepositoryInterface,
    skillRegistry: SkillRegistryInterface,
    safetyInspector: SkillSafetyInspectorInterface
): Array<ToolInterface> => {
    const client = new ClawHubClient()

    return [
        new ClawHubSearchTool(client),
        new ClawHubSkillInfoTool(client),
        new ClawHubSkillVersionsTool(client),
        new ClawHubInstallTool(client, skillRepository, skillRegistry, safetyInspector),
        new ClawHubUpdateTool(client, skillRepository, skillRegistry, safetyInspector)
    ]
}
