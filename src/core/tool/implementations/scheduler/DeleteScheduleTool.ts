import { z } from 'zod'
import { SessionManagerInterface } from '@session'
import {
    SCHEDULED_TASK_EXECUTION_TYPE,
    SCHEDULED_TASK_SESSION_MODE,
    ScheduledTaskRegistryInterface,
    ScheduledTaskRepositoryInterface,
    ScheduledTaskRunRepositoryInterface
} from '@scheduler'
import { AgentToolError } from '../../errors'
import { BaseSchedulerTool } from './bases/BaseSchedulerTool'
import { deleteScheduleToolSchema } from './validators'

export class DeleteScheduleTool extends BaseSchedulerTool<typeof deleteScheduleToolSchema> {
    readonly name = 'schedule_delete'
    readonly description =
        'Permanently deletes a scheduled task. This action cannot be undone. Also removes its persistent execution session (if it used one) and its entire run history.'
    readonly schema = deleteScheduleToolSchema

    constructor(
        private readonly scheduledTaskRepository: ScheduledTaskRepositoryInterface,
        private readonly scheduledTaskRegistry: ScheduledTaskRegistryInterface,
        private readonly scheduledTaskRunRepository: ScheduledTaskRunRepositoryInterface,
        private readonly sessionManager: SessionManagerInterface
    ) {
        super()
    }

    protected async run(args: z.infer<typeof deleteScheduleToolSchema>): Promise<{ taskId: string }> {
        const task = this.scheduledTaskRegistry.get(args.taskId)

        if (task === null) {
            throw new AgentToolError(`Scheduled task "${args.taskId}" not found`)
        }

        await this.scheduledTaskRepository.delete(args.taskId)
        this.scheduledTaskRegistry.unregister(args.taskId)

        if (
            task.execution.type === SCHEDULED_TASK_EXECUTION_TYPE.PROMPT &&
            task.execution.sessionMode === SCHEDULED_TASK_SESSION_MODE.PERSISTENT
        ) {
            await this.sessionManager.delete(`scheduler-${args.taskId}`)
        }

        await this.scheduledTaskRunRepository.deleteByTaskId(args.taskId)

        return { taskId: args.taskId }
    }
}
