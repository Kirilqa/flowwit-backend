import { z } from 'zod'
import { ScheduledTaskRunRepositoryInterface } from '@scheduler'
import { BaseSchedulerTool } from './bases/BaseSchedulerTool'
import { ScheduledTaskRunSummary } from './types'
import { listScheduleRunsToolSchema } from './validators'

export class ListScheduleRunsTool extends BaseSchedulerTool<typeof listScheduleRunsToolSchema> {
    readonly name = 'schedule_list_runs'
    readonly description =
        'Lists scheduled task runs with optional filters. Use taskId to scope to a specific task and status to filter by execution state. Does not include full event logs — use schedule_run_info for that.'
    readonly schema = listScheduleRunsToolSchema

    constructor(private readonly scheduledTaskRunRepository: ScheduledTaskRunRepositoryInterface) {
        super()
    }

    protected async run(args: z.infer<typeof listScheduleRunsToolSchema>): Promise<Array<ScheduledTaskRunSummary>> {
        const runs =
            args.taskId !== undefined
                ? await this.scheduledTaskRunRepository.findByTaskId(args.taskId)
                : await this.scheduledTaskRunRepository.findAll()

        return runs
            .filter(run => args.status === undefined || run.status === args.status)
            .map(run => ({
                id: run.id,
                taskId: run.taskId,
                status: run.status,
                startedAt: run.startedAt,
                ...(run.completedAt !== undefined && { completedAt: run.completedAt }),
                ...(run.outcome !== undefined && { outcome: run.outcome })
            }))
    }
}
