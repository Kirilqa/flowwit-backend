import { BaseRegistry } from '@core/bases'
import { ScheduledTaskRegistryInterface } from '../interfaces'
import { ScheduledTask } from '../types'

export class ScheduledTaskRegistry extends BaseRegistry<ScheduledTask> implements ScheduledTaskRegistryInterface {}
