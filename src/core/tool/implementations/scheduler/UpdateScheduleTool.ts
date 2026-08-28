import { z } from 'zod'
import { AgentRegistryInterface } from '@agent'
import { SkillRegistryInterface } from '@skill'
import { WorkFlowRegistryInterface } from '@workflow'
import { ScheduledTask, ScheduledTaskRegistryInterface, ScheduledTaskRepositoryInterface } from '@scheduler'
import { AgentToolError } from '../../errors'
import { BaseSchedulerTool } from './bases/BaseSchedulerTool'
import { computeInitialNextFireAt, validateScheduledTaskExecution } from './utils'
import { updateScheduleToolSchema } from './validators'

export class UpdateScheduleTool extends BaseSchedulerTool<typeof updateScheduleToolSchema> {
    readonly name = 'schedule_update'
    readonly description =
        'Updates an existing scheduled task. Only provided fields change, each replacing the previous value entirely (no partial merge inside schedule/execution/destination). Recomputes the next fire time if the schedule changes.'
    readonly schema = updateScheduleToolSchema

    constructor(
        private readonly scheduledTaskRepository: ScheduledTaskRepositoryInterface,
        private readonly scheduledTaskRegistry: ScheduledTaskRegistryInterface,
        private readonly agentRegistry: AgentRegistryInterface,
        private readonly workflowRegistry: WorkFlowRegistryInterface,
        private readonly skillRegistry: SkillRegistryInterface
    ) {
        super()
    }

    protected async run(args: z.infer<typeof updateScheduleToolSchema>): Promise<ScheduledTask> {
        const existing = this.scheduledTaskRegistry.get(args.taskId)

        if (existing === null) {
            throw new AgentToolError(`Scheduled task "${args.taskId}" not found`)
        }

        const execution = args.execution ?? existing.execution
        validateScheduledTaskExecution(execution, this.agentRegistry, this.workflowRegistry, this.skillRegistry)

        const schedule = args.schedule ?? existing.schedule
        const nextFireAt = args.schedule !== undefined ? computeInitialNextFireAt(schedule) : existing.nextFireAt

        const updated: ScheduledTask = {
            ...existing,
            schedule,
            execution,
            destination: args.destination ?? existing.destination,
            nextFireAt
        }

        await this.scheduledTaskRepository.update(args.taskId, updated)
        this.scheduledTaskRegistry.register(args.taskId, updated)

        return updated
    }
}
