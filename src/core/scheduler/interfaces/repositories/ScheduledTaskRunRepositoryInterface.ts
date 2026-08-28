import { InitializableInterface, RepositoryInterface } from '@core/interfaces'
import { ScheduledTaskRun } from '../../types'

export interface ScheduledTaskRunRepositoryInterface
    extends RepositoryInterface<ScheduledTaskRun>, InitializableInterface {
    findByTaskId(taskId: string): Promise<Array<ScheduledTaskRun>>
    deleteByTaskId(taskId: string): Promise<void>
    pruneOldest(taskId: string, keep: number): Promise<void>
}
