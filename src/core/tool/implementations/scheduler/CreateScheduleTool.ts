import { z } from 'zod'
import { randomUUID } from 'crypto'
import { AgentRegistryInterface } from '@agent'
import { SkillRegistryInterface } from '@skill'
import { WorkFlowRegistryInterface } from '@workflow'
import { ScheduledTask, ScheduledTaskRegistryInterface, ScheduledTaskRepositoryInterface } from '@scheduler'
import { BaseSchedulerTool } from './bases/BaseSchedulerTool'
import { computeInitialNextFireAt, validateScheduledTaskExecution } from './utils'
import { createScheduleToolSchema } from './validators'

export class CreateScheduleTool extends BaseSchedulerTool<typeof createScheduleToolSchema> {
    readonly name = 'schedule_create'
    readonly description =
        'Creates a new scheduled task and computes its first fire time automatically. Returns the created task. The task starts enabled.'
    readonly schema = createScheduleToolSchema

    constructor(
        private readonly scheduledTaskRepository: ScheduledTaskRepositoryInterface,
        private readonly scheduledTaskRegistry: ScheduledTaskRegistryInterface,
        private readonly agentRegistry: AgentRegistryInterface,
        private readonly workflowRegistry: WorkFlowRegistryInterface,
        private readonly skillRegistry: SkillRegistryInterface
    ) {
        super()
    }

    protected async run(args: z.infer<typeof createScheduleToolSchema>): Promise<ScheduledTask> {
        validateScheduledTaskExecution(args.execution, this.agentRegistry, this.workflowRegistry, this.skillRegistry)

        const task: ScheduledTask = {
            id: randomUUID(),
            schedule: args.schedule,
            execution: args.execution,
            destination: args.destination,
            nextFireAt: computeInitialNextFireAt(args.schedule),
            enabled: true
        }

        await this.scheduledTaskRepository.create(task)
        this.scheduledTaskRegistry.register(task.id, task)

        return task
    }
}
