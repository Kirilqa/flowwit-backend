import { parseSkillMarkdown } from '../utils'
import { SkillSeed } from '../types'
import { AGENT_MANAGER_SKILL_MD } from './content/agentManagerSkillMd'
import { MCP_MANAGER_SKILL_MD } from './content/mcpManagerSkillMd'
import { SCHEDULER_MANAGER_SKILL_MD } from './content/schedulerManagerSkillMd'
import { SKILL_MANAGER_SKILL_MD } from './content/skillManagerSkillMd'
import { WORKFLOW_MANAGER_SKILL_MD } from './content/workflowManagerSkillMd'
import { WORKFLOW_MANAGER_NODES_MD } from './content/workflowManagerNodesMd'

export const DEFAULT_SKILLS: Array<SkillSeed> = [
    { skill: parseSkillMarkdown(AGENT_MANAGER_SKILL_MD) },
    { skill: parseSkillMarkdown(MCP_MANAGER_SKILL_MD) },
    { skill: parseSkillMarkdown(SCHEDULER_MANAGER_SKILL_MD) },
    { skill: parseSkillMarkdown(SKILL_MANAGER_SKILL_MD) },
    {
        skill: parseSkillMarkdown(WORKFLOW_MANAGER_SKILL_MD),
        resources: { 'NODES.md': WORKFLOW_MANAGER_NODES_MD }
    }
]
