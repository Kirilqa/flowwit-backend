import { ScheduledTaskUpdater } from '@scheduler/updaters/ScheduledTaskUpdater'
import { WatcherEvent, WATCHER_EVENT_TYPE } from '@core/watcher'
import { makeScheduledTask, makeTaskRegistry, makeTaskRepository } from '../../../../helpers/makeScheduledTask'

function addEvent(): WatcherEvent {
    return { type: WATCHER_EVENT_TYPE.ADD, path: 'scheduler/tasks.json' }
}

function changeEvent(): WatcherEvent {
    return { type: WATCHER_EVENT_TYPE.CHANGE, path: 'scheduler/tasks.json' }
}

function unlinkEvent(): WatcherEvent {
    return { type: WATCHER_EVENT_TYPE.UNLINK, path: 'scheduler/tasks.json' }
}

describe('ScheduledTaskUpdater', () => {
    describe('ADD / CHANGE events', () => {
        it('registers a new task from the repository', async () => {
            const task = makeScheduledTask({ id: 'task-1' })
            const taskRepository = makeTaskRepository([task])
            const taskRegistry = makeTaskRegistry()
            const updater = new ScheduledTaskUpdater(taskRepository, taskRegistry)

            await updater.handle(addEvent())

            expect(taskRegistry.register).toHaveBeenCalledWith('task-1', task)
        })

        it('does not re-register a task whose contents did not change', async () => {
            const task = makeScheduledTask({ id: 'task-1' })
            const taskRepository = makeTaskRepository([task])
            const taskRegistry = makeTaskRegistry()
            const updater = new ScheduledTaskUpdater(taskRepository, taskRegistry)

            await updater.handle(addEvent())
            await updater.handle(changeEvent())

            expect(taskRegistry.register).toHaveBeenCalledTimes(1)
        })

        it('re-registers a task whose contents changed since the last fingerprint', async () => {
            const taskRepository = makeTaskRepository([makeScheduledTask({ id: 'task-1', enabled: true })])
            const taskRegistry = makeTaskRegistry()
            const updater = new ScheduledTaskUpdater(taskRepository, taskRegistry)

            await updater.handle(addEvent())

            const updatedTask = makeScheduledTask({ id: 'task-1', enabled: false })
            ;(taskRepository.findAll as jest.Mock).mockResolvedValue([updatedTask])
            await updater.handle(changeEvent())

            expect(taskRegistry.register).toHaveBeenCalledTimes(2)
            expect(taskRegistry.register).toHaveBeenLastCalledWith('task-1', updatedTask)
        })

        it('unregisters a task that is no longer present in the repository', async () => {
            const task = makeScheduledTask({ id: 'task-1' })
            const taskRepository = makeTaskRepository([task])
            const taskRegistry = makeTaskRegistry()
            const updater = new ScheduledTaskUpdater(taskRepository, taskRegistry)

            await updater.handle(addEvent())
            ;(taskRepository.findAll as jest.Mock).mockResolvedValue([])
            await updater.handle(changeEvent())

            expect(taskRegistry.unregister).toHaveBeenCalledWith('task-1')
        })

        it('registers multiple new tasks and leaves unrelated existing ones untouched', async () => {
            const taskA = makeScheduledTask({ id: 'task-a' })
            const taskB = makeScheduledTask({ id: 'task-b' })
            const taskRepository = makeTaskRepository([taskA])
            const taskRegistry = makeTaskRegistry()
            const updater = new ScheduledTaskUpdater(taskRepository, taskRegistry)

            await updater.handle(addEvent())
            ;(taskRepository.findAll as jest.Mock).mockResolvedValue([taskA, taskB])
            await updater.handle(changeEvent())

            expect(taskRegistry.register).toHaveBeenCalledWith('task-b', taskB)
            expect(taskRegistry.register).toHaveBeenCalledTimes(2)
        })
    })

    describe('UNLINK events', () => {
        it('unregisters every currently registered task', async () => {
            const taskA = makeScheduledTask({ id: 'task-a' })
            const taskB = makeScheduledTask({ id: 'task-b' })
            const taskRepository = makeTaskRepository()
            const taskRegistry = makeTaskRegistry([taskA, taskB])
            const updater = new ScheduledTaskUpdater(taskRepository, taskRegistry)

            await updater.handle(unlinkEvent())

            expect(taskRegistry.unregister).toHaveBeenCalledWith('task-a')
            expect(taskRegistry.unregister).toHaveBeenCalledWith('task-b')
            expect(taskRepository.findAll).not.toHaveBeenCalled()
        })

        it('re-registers a task on a later ADD even though its contents did not change', async () => {
            const task = makeScheduledTask({ id: 'task-1' })
            const taskRepository = makeTaskRepository([task])
            const taskRegistry = makeTaskRegistry()
            const updater = new ScheduledTaskUpdater(taskRepository, taskRegistry)

            await updater.handle(addEvent())
            await updater.handle(unlinkEvent())
            await updater.handle(addEvent())

            expect(taskRegistry.register).toHaveBeenCalledTimes(2)
        })
    })
})
