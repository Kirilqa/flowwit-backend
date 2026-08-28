import { z } from 'zod'
import { ScheduledTaskRun, ScheduledTaskRunRepositoryInterface } from '@scheduler'
import { AgentToolError } from '../../errors'
import { BaseSchedulerTool } from './bases/BaseSchedulerTool'
import { infoScheduleRunToolSchema } from './validators'

export class InfoScheduleRunTool extends BaseSchedulerTool<typeof infoScheduleRunToolSchema> {
    readonly name = 'schedule_run_info'
    readonly description =
        'Returns the full details of a scheduled task run — status, timing, the complete finalized event log, and the delivery outcome.'
    readonly schema = infoScheduleRunToolSchema

    constructor(private readonly scheduledTaskRunRepository: ScheduledTaskRunRepositoryInterface) {
        super()
    }

    protected async run(args: z.infer<typeof infoScheduleRunToolSchema>): Promise<ScheduledTaskRun> {
        const run = await this.scheduledTaskRunRepository.findById(args.runId)

        if (run === null) {
            throw new AgentToolError(`Scheduled task run "${args.runId}" not found`)
        }

        return run
    }
}
