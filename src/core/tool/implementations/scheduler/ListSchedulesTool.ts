import { z } from 'zod'
import { ScheduledTask, ScheduledTaskRegistryInterface } from '@scheduler'
import { BaseSchedulerTool } from './bases/BaseSchedulerTool'
import { listSchedulesToolSchema } from './validators'

export class ListSchedulesTool extends BaseSchedulerTool<typeof listSchedulesToolSchema> {
    readonly name = 'schedule_list'
    readonly description = 'Lists all scheduled tasks in the system with their full configuration.'
    readonly schema = listSchedulesToolSchema

    constructor(private readonly scheduledTaskRegistry: ScheduledTaskRegistryInterface) {
        super()
    }

    protected async run(_args: z.infer<typeof listSchedulesToolSchema>): Promise<Array<ScheduledTask>> {
        return this.scheduledTaskRegistry.list()
    }
}
