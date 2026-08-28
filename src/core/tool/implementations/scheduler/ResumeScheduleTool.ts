import { z } from 'zod'
import { ScheduledTask, ScheduledTaskRegistryInterface, ScheduledTaskRepositoryInterface } from '@scheduler'
import { AgentToolError } from '../../errors'
import { BaseSchedulerTool } from './bases/BaseSchedulerTool'
import { computeInitialNextFireAt } from './utils'
import { resumeScheduleToolSchema } from './validators'

export class ResumeScheduleTool extends BaseSchedulerTool<typeof resumeScheduleToolSchema> {
    readonly name = 'schedule_resume'
    readonly description =
        'Resumes a paused scheduled task. Recomputes the next fire time fresh from now — the paused period is not treated as downtime to catch up on.'
    readonly schema = resumeScheduleToolSchema

    constructor(
        private readonly scheduledTaskRepository: ScheduledTaskRepositoryInterface,
        private readonly scheduledTaskRegistry: ScheduledTaskRegistryInterface
    ) {
        super()
    }

    protected async run(args: z.infer<typeof resumeScheduleToolSchema>): Promise<ScheduledTask> {
        const existing = this.scheduledTaskRegistry.get(args.taskId)

        if (existing === null) {
            throw new AgentToolError(`Scheduled task "${args.taskId}" not found`)
        }

        const nextFireAt = computeInitialNextFireAt(existing.schedule)
        const updated: ScheduledTask = { ...existing, enabled: true, nextFireAt }

        await this.scheduledTaskRepository.update(args.taskId, { enabled: true, nextFireAt })
        this.scheduledTaskRegistry.register(args.taskId, updated)

        return updated
    }
}
