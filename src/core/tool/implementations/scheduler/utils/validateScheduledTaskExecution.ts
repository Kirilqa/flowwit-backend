import { AgentRegistryInterface } from '@agent'
import { SkillRegistryInterface } from '@skill'
import { WorkFlowRegistryInterface } from '@workflow'
import { SCHEDULED_TASK_EXECUTION_TYPE, ScheduledTaskExecution } from '@scheduler'
import { AgentToolError } from '../../../errors'

export function validateScheduledTaskExecution(
    execution: ScheduledTaskExecution,
    agentRegistry: AgentRegistryInterface,
    workflowRegistry: WorkFlowRegistryInterface,
    skillRegistry: SkillRegistryInterface
): void {
    if (execution.type === SCHEDULED_TASK_EXECUTION_TYPE.PROMPT) {
        if (agentRegistry.get(execution.agentId) === null) {
            throw new AgentToolError(`Agent "${execution.agentId}" not found`)
        }

        const missingSkills = (execution.skills ?? []).filter(name => skillRegistry.get(name) === null)

        if (missingSkills.length > 0) {
            throw new AgentToolError(`Skills not found: ${missingSkills.join(', ')}`)
        }

        return
    }

    if (workflowRegistry.get(execution.workflowId) === null) {
        throw new AgentToolError(`WorkFlow "${execution.workflowId}" not found`)
    }
}
