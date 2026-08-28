import { z } from 'zod'
import { SchedulerInterface, ScheduledTaskRegistryInterface } from '@scheduler'
import { AgentToolError } from '../../errors'
import { BaseSchedulerTool } from './bases/BaseSchedulerTool'
import { runScheduleNowToolSchema } from './validators'

export class RunScheduleNowTool extends BaseSchedulerTool<typeof runScheduleNowToolSchema> {
    readonly name = 'schedule_run_now'
    readonly description =
        'Forces a scheduled task to fire immediately, ignoring its next fire time. Runs in the background and returns the run ID right away — use schedule_run_info to check progress and outcome.'
    readonly schema = runScheduleNowToolSchema

    constructor(
        private readonly scheduler: SchedulerInterface,
        private readonly scheduledTaskRegistry: ScheduledTaskRegistryInterface
    ) {
        super()
    }

    protected async run(args: z.infer<typeof runScheduleNowToolSchema>): Promise<{ runId: string }> {
        if (this.scheduledTaskRegistry.get(args.taskId) === null) {
            throw new AgentToolError(`Scheduled task "${args.taskId}" not found`)
        }

        const runId = await this.scheduler.runNow(args.taskId)

        return { runId }
    }
}
