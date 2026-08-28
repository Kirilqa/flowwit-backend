import { RawAgentConfigRepositoryInterface, AgentRegistryInterface } from '@agent'
import { SkillRegistryInterface, SkillRepositoryInterface } from '@skill'
import { ToolInterface } from '../../../interfaces'
import { CreateSkillTool } from '../CreateSkillTool'
import { DeleteSkillResourceTool } from '../DeleteSkillResourceTool'
import { DeleteSkillTool } from '../DeleteSkillTool'
import { ListSkillResourcesTool } from '../ListSkillResourcesTool'
import { ListSkillsTool } from '../ListSkillsTool'
import { ReadSkillResourceTool } from '../ReadSkillResourceTool'
import { ReadSkillTool } from '../ReadSkillTool'
import { RegisterSkillTool } from '../RegisterSkillTool'
import { RunSkillResourceTool } from '../RunSkillResourceTool'
import { UnregisterSkillTool } from '../UnregisterSkillTool'
import { UpdateSkillTool } from '../UpdateSkillTool'
import { WriteSkillResourceTool } from '../WriteSkillResourceTool'

export const createSkillTools = (
    skillRepository: SkillRepositoryInterface,
    skillRegistry: SkillRegistryInterface,
    agentRegistry: AgentRegistryInterface,
    agentConfigRepository?: RawAgentConfigRepositoryInterface
): Array<ToolInterface> => {
    return [
        new CreateSkillTool(skillRepository, skillRegistry),
        new UpdateSkillTool(skillRepository, skillRegistry),
        new DeleteSkillTool(skillRepository, skillRegistry),
        new ListSkillsTool(skillRegistry),
        new ReadSkillTool(skillRegistry),
        new WriteSkillResourceTool(skillRegistry, skillRepository),
        new ReadSkillResourceTool(skillRegistry, skillRepository),
        new DeleteSkillResourceTool(skillRegistry, skillRepository),
        new RunSkillResourceTool(skillRegistry, skillRepository),
        new ListSkillResourcesTool(skillRegistry),
        new RegisterSkillTool(skillRegistry, agentRegistry, agentConfigRepository ?? null),
        new UnregisterSkillTool(agentRegistry, agentConfigRepository ?? null)
    ]
}
