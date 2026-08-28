import { InitializableInterface, RepositoryInterface } from '@core/interfaces'
import { ScheduledTask } from '../../types'

export interface ScheduledTaskRepositoryInterface extends RepositoryInterface<ScheduledTask>, InitializableInterface {}
