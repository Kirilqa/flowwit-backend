import { writeFile } from 'fs/promises'
import { join } from 'path'
import { JsonScheduledTaskRepository } from '@scheduler/repositories/JsonScheduledTaskRepository'
import { makeTempDir, removeTempDir } from '../../../../helpers/tempDir'
import { makeScheduledTask } from '../../../../helpers/makeScheduledTask'

describe('JsonScheduledTaskRepository (integration)', () => {
    let testDir: string
    let filePath: string
    let repository: JsonScheduledTaskRepository

    beforeEach(async () => {
        testDir = await makeTempDir('scheduled-task-repo-test')
        filePath = join(testDir, 'scheduled-tasks.json')
        repository = new JsonScheduledTaskRepository(filePath)
    })

    afterEach(async () => {
        await removeTempDir(testDir)
    })

    describe('findAll()', () => {
        it('returns an empty array when the file does not exist yet', async () => {
            expect(await repository.findAll()).toEqual([])
        })

        it('returns all persisted tasks', async () => {
            await repository.create(makeScheduledTask({ id: 'task-1' }))
            await repository.create(makeScheduledTask({ id: 'task-2' }))

            const tasks = await repository.findAll()
            expect(tasks.map(task => task.id).sort()).toEqual(['task-1', 'task-2'])
        })

        it('throws when the file contains invalid JSON', async () => {
            await writeFile(filePath, 'not json', 'utf-8')
            await expect(repository.findAll()).rejects.toThrow(/Failed to parse JSON file/)
        })

        it('throws when the file contents fail schema validation', async () => {
            await writeFile(filePath, JSON.stringify({ tasks: [{ id: 'bad' }] }), 'utf-8')
            await expect(repository.findAll()).rejects.toThrow(/Invalid config file/)
        })
    })

    describe('findById()', () => {
        it('returns null for an unknown id', async () => {
            expect(await repository.findById('missing')).toBeNull()
        })

        it('returns the matching task', async () => {
            await repository.create(makeScheduledTask({ id: 'task-1' }))
            const found = await repository.findById('task-1')
            expect(found?.id).toBe('task-1')
        })
    })

    describe('create()', () => {
        it('persists a new task and returns it', async () => {
            const task = makeScheduledTask({ id: 'task-1' })
            const result = await repository.create(task)

            expect(result).toEqual(task)
            expect(await repository.findById('task-1')).toEqual(task)
        })

        it('overwrites an existing task with the same id instead of duplicating it', async () => {
            await repository.create(makeScheduledTask({ id: 'task-1', enabled: true }))
            await repository.create(makeScheduledTask({ id: 'task-1', enabled: false }))

            const tasks = await repository.findAll()
            expect(tasks).toHaveLength(1)
            expect(tasks[0]?.enabled).toBe(false)
        })
    })

    describe('update()', () => {
        it('merges the patch into the existing task and persists it', async () => {
            await repository.create(makeScheduledTask({ id: 'task-1', enabled: true }))

            const updated = await repository.update('task-1', { enabled: false })

            expect(updated.enabled).toBe(false)
            expect(await repository.findById('task-1')).toEqual(updated)
        })

        it('throws for an unknown task id', async () => {
            await expect(repository.update('missing', { enabled: false })).rejects.toThrow(
                'Scheduled task "missing" not found'
            )
        })
    })

    describe('delete()', () => {
        it('removes the task so findById returns null', async () => {
            await repository.create(makeScheduledTask({ id: 'task-1' }))
            await repository.delete('task-1')

            expect(await repository.findById('task-1')).toBeNull()
        })

        it('leaves other tasks untouched', async () => {
            await repository.create(makeScheduledTask({ id: 'task-1' }))
            await repository.create(makeScheduledTask({ id: 'task-2' }))

            await repository.delete('task-1')

            const tasks = await repository.findAll()
            expect(tasks.map(task => task.id)).toEqual(['task-2'])
        })

        it('does not throw when deleting an unknown task id', async () => {
            await expect(repository.delete('missing')).resolves.toBeUndefined()
        })
    })
})
