import { z } from 'zod'
import { ScheduledTask, ScheduledTaskRegistryInterface } from '@scheduler'
import { AgentToolError } from '../../errors'
import { BaseSchedulerTool } from './bases/BaseSchedulerTool'
import { infoScheduleToolSchema } from './validators'

export class InfoScheduleTool extends BaseSchedulerTool<typeof infoScheduleToolSchema> {
    readonly name = 'schedule_info'
    readonly description = 'Returns the full configuration of a single scheduled task.'
    readonly schema = infoScheduleToolSchema

    constructor(private readonly scheduledTaskRegistry: ScheduledTaskRegistryInterface) {
        super()
    }

    protected async run(args: z.infer<typeof infoScheduleToolSchema>): Promise<ScheduledTask> {
        const task = this.scheduledTaskRegistry.get(args.taskId)

        if (task === null) {
            throw new AgentToolError(`Scheduled task "${args.taskId}" not found`)
        }

        return task
    }
}
