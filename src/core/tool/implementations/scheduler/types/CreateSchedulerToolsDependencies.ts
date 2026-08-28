import { AgentRegistryInterface } from '@agent'
import { SessionManagerInterface } from '@session'
import { SkillRegistryInterface } from '@skill'
import { WorkFlowRegistryInterface } from '@workflow'
import {
    SchedulerInterface,
    ScheduledTaskRegistryInterface,
    ScheduledTaskRepositoryInterface,
    ScheduledTaskRunRepositoryInterface
} from '@scheduler'

export type CreateSchedulerToolsDependencies = {
    scheduler: SchedulerInterface
    scheduledTaskRegistry: ScheduledTaskRegistryInterface
    scheduledTaskRepository: ScheduledTaskRepositoryInterface
    scheduledTaskRunRepository: ScheduledTaskRunRepositoryInterface
    agentRegistry: AgentRegistryInterface
    workflowRegistry: WorkFlowRegistryInterface
    skillRegistry: SkillRegistryInterface
    sessionManager: SessionManagerInterface
}
