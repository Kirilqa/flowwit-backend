import { WorkFlow, WorkFlowRun, WorkFlowRunError } from '@workflow'
import { InMemoryWorkFlowRunRepository } from '@workflow/repositories/InMemoryWorkFlowRunRepository'

describe('InMemoryWorkFlowRunRepository', () => {
    let repository: InMemoryWorkFlowRunRepository

    beforeEach(() => {
        repository = new InMemoryWorkFlowRunRepository()
    })

    it('create then findById returns the run', async () => {
        const run = new WorkFlowRun('input', new WorkFlow('wf', 'WF'))
        await repository.create(run)

        const found = await repository.findById(run.id)
        expect(found).not.toBeNull()
    })

    it('findById returns null for unknown id', async () => {
        expect(await repository.findById('missing')).toBeNull()
    })

    it('findAll returns all created runs', async () => {
        const wf = new WorkFlow('wf', 'WF')
        await repository.create(new WorkFlowRun('a', wf))
        await repository.create(new WorkFlowRun('b', wf))

        expect(await repository.findAll()).toHaveLength(2)
    })

    it('findAll returns empty array when repository is empty', async () => {
        expect(await repository.findAll()).toEqual([])
    })

    it('delete removes the run', async () => {
        const run = new WorkFlowRun('input', new WorkFlow('wf', 'WF'))
        await repository.create(run)
        await repository.delete(run.id)

        expect(await repository.findById(run.id)).toBeNull()
    })

    it('update on non-existent id throws WorkFlowRunError', async () => {
        const run = new WorkFlowRun('input', new WorkFlow('wf', 'WF'))
        await expect(repository.update('missing', run)).rejects.toBeInstanceOf(WorkFlowRunError)
    })
})
