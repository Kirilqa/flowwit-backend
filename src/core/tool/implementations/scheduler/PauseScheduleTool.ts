import { z } from 'zod'
import { ScheduledTask, ScheduledTaskRegistryInterface, ScheduledTaskRepositoryInterface } from '@scheduler'
import { AgentToolError } from '../../errors'
import { BaseSchedulerTool } from './bases/BaseSchedulerTool'
import { pauseScheduleToolSchema } from './validators'

export class PauseScheduleTool extends BaseSchedulerTool<typeof pauseScheduleToolSchema> {
    readonly name = 'schedule_pause'
    readonly description =
        'Pauses a scheduled task — it stops firing until resumed, without deleting it. The already-computed next fire time is left untouched.'
    readonly schema = pauseScheduleToolSchema

    constructor(
        private readonly scheduledTaskRepository: ScheduledTaskRepositoryInterface,
        private readonly scheduledTaskRegistry: ScheduledTaskRegistryInterface
    ) {
        super()
    }

    protected async run(args: z.infer<typeof pauseScheduleToolSchema>): Promise<ScheduledTask> {
        const existing = this.scheduledTaskRegistry.get(args.taskId)

        if (existing === null) {
            throw new AgentToolError(`Scheduled task "${args.taskId}" not found`)
        }

        const updated: ScheduledTask = { ...existing, enabled: false }

        await this.scheduledTaskRepository.update(args.taskId, { enabled: false })
        this.scheduledTaskRegistry.register(args.taskId, updated)

        return updated
    }
}
