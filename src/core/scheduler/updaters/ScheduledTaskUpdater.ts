import { stableStringify } from '@core/utils'
import { WatcherEventUpdaterInterface, WatcherEvent, WATCHER_EVENT_TYPE } from '@core/watcher'
import { ScheduledTaskRegistryInterface, ScheduledTaskRepositoryInterface } from '../interfaces'

export class ScheduledTaskUpdater implements WatcherEventUpdaterInterface {
    private readonly fingerprints = new Map<string, string>()

    constructor(
        private readonly taskRepository: ScheduledTaskRepositoryInterface,
        private readonly taskRegistry: ScheduledTaskRegistryInterface
    ) {}

    async handle(event: WatcherEvent): Promise<void> {
        if (event.type === WATCHER_EVENT_TYPE.ADD || event.type === WATCHER_EVENT_TYPE.CHANGE) {
            await this.handleUpsert()
            return
        }

        this.handleUnlink()
    }

    private async handleUpsert(): Promise<void> {
        const tasks = await this.taskRepository.findAll()
        const taskIds = new Set(tasks.map(task => task.id))

        for (const task of tasks) {
            const fingerprint = stableStringify(task)

            if (this.fingerprints.get(task.id) === fingerprint) {
                continue
            }

            this.taskRegistry.register(task.id, task)
            this.fingerprints.set(task.id, fingerprint)
        }

        for (const task of this.taskRegistry.list()) {
            if (!taskIds.has(task.id)) {
                this.taskRegistry.unregister(task.id)
                this.fingerprints.delete(task.id)
            }
        }
    }

    private handleUnlink(): void {
        for (const task of this.taskRegistry.list()) {
            this.taskRegistry.unregister(task.id)
            this.fingerprints.delete(task.id)
        }
    }
}
