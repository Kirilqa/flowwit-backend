import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { JsonScheduledTaskRunRepository } from '@scheduler/repositories/JsonScheduledTaskRunRepository'
import { SCHEDULED_TASK_RUN_STATUS } from '@scheduler'
import { makeTempDir, removeTempDir } from '../../../../helpers/tempDir'
import { makeScheduledTaskRun } from '../../../../helpers/makeScheduledTaskRun'

describe('JsonScheduledTaskRunRepository (integration)', () => {
    let testDir: string
    let repository: JsonScheduledTaskRunRepository

    beforeEach(async () => {
        testDir = await makeTempDir('scheduled-task-run-repo-test')
        repository = new JsonScheduledTaskRunRepository(testDir)
    })

    afterEach(async () => {
        await removeTempDir(testDir)
    })

    describe('findAll()', () => {
        it('creates the directory and returns an empty array when nothing exists yet', async () => {
            expect(await repository.findAll()).toEqual([])
        })

        it('returns runs across multiple task subfolders', async () => {
            await repository.create(makeScheduledTaskRun({ id: 'run-1', taskId: 'task-a' }))
            await repository.create(makeScheduledTaskRun({ id: 'run-2', taskId: 'task-b' }))

            const runs = await repository.findAll()
            expect(runs.map(run => run.id).sort()).toEqual(['run-1', 'run-2'])
        })

        it('ignores non-directory entries and non-json files in a task directory', async () => {
            await repository.create(makeScheduledTaskRun({ id: 'run-1', taskId: 'task-a' }))

            const runs = await repository.findAll()
            expect(runs).toHaveLength(1)
        })

        it('skips a run file that fails to parse instead of throwing', async () => {
            const taskDir = join(testDir, 'task-a')
            await mkdir(taskDir, { recursive: true })
            await writeFile(join(taskDir, 'corrupt.json'), 'not json', 'utf-8')
            await repository.create(makeScheduledTaskRun({ id: 'run-1', taskId: 'task-a' }))

            const runs = await repository.findAll()
            expect(runs.map(run => run.id)).toEqual(['run-1'])
        })
    })

    describe('findById()', () => {
        it('returns null for an unknown run id', async () => {
            expect(await repository.findById('missing')).toBeNull()
        })

        it('returns the matching run via a full scan when the cache is cold', async () => {
            const freshRepository = new JsonScheduledTaskRunRepository(testDir)
            await repository.create(makeScheduledTaskRun({ id: 'run-1', taskId: 'task-a' }))

            const found = await freshRepository.findById('run-1')
            expect(found?.id).toBe('run-1')
        })

        it('returns the matching run via the in-memory cache after create()', async () => {
            await repository.create(makeScheduledTaskRun({ id: 'run-1', taskId: 'task-a' }))

            const found = await repository.findById('run-1')
            expect(found?.id).toBe('run-1')
        })
    })

    describe('findByTaskId()', () => {
        it('returns an empty array for a task with no runs yet', async () => {
            expect(await repository.findByTaskId('task-a')).toEqual([])
        })

        it('returns only runs belonging to the given task', async () => {
            await repository.create(makeScheduledTaskRun({ id: 'run-1', taskId: 'task-a' }))
            await repository.create(makeScheduledTaskRun({ id: 'run-2', taskId: 'task-b' }))

            const runs = await repository.findByTaskId('task-a')
            expect(runs.map(run => run.id)).toEqual(['run-1'])
        })
    })

    describe('create()', () => {
        it('persists the run under a per-task subfolder and returns it', async () => {
            const run = makeScheduledTaskRun({ id: 'run-1', taskId: 'task-a' })
            const result = await repository.create(run)

            expect(result).toEqual(run)
            expect(await repository.findById('run-1')).toEqual(run)
        })
    })

    describe('update()', () => {
        it('merges the patch into the existing run and persists it', async () => {
            await repository.create(
                makeScheduledTaskRun({ id: 'run-1', taskId: 'task-a', status: SCHEDULED_TASK_RUN_STATUS.RUNNING })
            )

            const updated = await repository.update('run-1', { status: SCHEDULED_TASK_RUN_STATUS.COMPLETED })

            expect(updated.status).toBe(SCHEDULED_TASK_RUN_STATUS.COMPLETED)
            expect(await repository.findById('run-1')).toEqual(updated)
        })

        it('throws for an unknown run id', async () => {
            await expect(repository.update('missing', { status: SCHEDULED_TASK_RUN_STATUS.COMPLETED })).rejects.toThrow(
                'Scheduled task run "missing" not found'
            )
        })
    })

    describe('delete()', () => {
        it('removes the run so findById returns null', async () => {
            await repository.create(makeScheduledTaskRun({ id: 'run-1', taskId: 'task-a' }))
            await repository.delete('run-1')

            expect(await repository.findById('run-1')).toBeNull()
        })

        it('does not throw when deleting an unknown run id', async () => {
            await expect(repository.delete('missing')).resolves.toBeUndefined()
        })

        it('does not throw when the cached run file was already removed on disk', async () => {
            await repository.create(makeScheduledTaskRun({ id: 'run-1', taskId: 'task-a' }))
            await removeTempDir(join(testDir, 'task-a'))

            await expect(repository.delete('run-1')).resolves.toBeUndefined()
        })
    })

    describe('deleteByTaskId()', () => {
        it('removes the whole task directory and all its runs', async () => {
            await repository.create(makeScheduledTaskRun({ id: 'run-1', taskId: 'task-a' }))
            await repository.create(makeScheduledTaskRun({ id: 'run-2', taskId: 'task-a' }))
            await repository.create(makeScheduledTaskRun({ id: 'run-3', taskId: 'task-b' }))

            await repository.deleteByTaskId('task-a')

            expect(await repository.findByTaskId('task-a')).toEqual([])
            const remaining = await repository.findAll()
            expect(remaining.map(run => run.id)).toEqual(['run-3'])
        })

        it('does not throw when the task directory does not exist', async () => {
            await expect(repository.deleteByTaskId('missing')).resolves.toBeUndefined()
        })
    })

    describe('pruneOldest()', () => {
        it('keeps the newest runs and removes the rest', async () => {
            await repository.create(makeScheduledTaskRun({ id: 'run-old', taskId: 'task-a', startedAt: 1000 }))
            await repository.create(makeScheduledTaskRun({ id: 'run-mid', taskId: 'task-a', startedAt: 2000 }))
            await repository.create(makeScheduledTaskRun({ id: 'run-new', taskId: 'task-a', startedAt: 3000 }))

            await repository.pruneOldest('task-a', 2)

            const runs = await repository.findByTaskId('task-a')
            expect(runs.map(run => run.id).sort()).toEqual(['run-mid', 'run-new'])
        })

        it('does nothing when the run count is already within the limit', async () => {
            await repository.create(makeScheduledTaskRun({ id: 'run-1', taskId: 'task-a' }))

            await repository.pruneOldest('task-a', 5)

            expect(await repository.findByTaskId('task-a')).toHaveLength(1)
        })
    })
})
