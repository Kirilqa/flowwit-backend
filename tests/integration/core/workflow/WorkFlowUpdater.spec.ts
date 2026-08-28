import { WorkFlow, WorkFlowRegistry, WorkFlowInterface, WorkFlowRepositoryInterface, InputNode } from '@workflow'
import { WorkFlowUpdater } from '@workflow/updaters/WorkFlowUpdater'
import { WATCHER_EVENT_TYPE } from '@watcher'
import { makeAgentInterface, makeAgentRegistry } from '../../../helpers/makeAgent'

class InMemoryWorkFlowRepository implements WorkFlowRepositoryInterface {
    private readonly store = new Map<string, WorkFlowInterface>()

    async findAll(): Promise<Array<WorkFlowInterface>> {
        return [...this.store.values()]
    }

    async findById(id: string): Promise<WorkFlowInterface | null> {
        return this.store.get(id) ?? null
    }

    async create(entity: WorkFlowInterface): Promise<WorkFlowInterface> {
        this.store.set(entity.id, entity)
        return entity
    }

    async update(id: string, workflow: WorkFlowInterface): Promise<WorkFlowInterface> {
        this.store.set(id, workflow)
        return workflow
    }

    async delete(id: string): Promise<void> {
        this.store.delete(id)
    }

    async ensureInitialized(): Promise<void> {}
}

class NullGetWorkFlowRegistry extends WorkFlowRegistry {
    override get(_id: string): WorkFlowInterface | null {
        return null
    }
}

class TrackingWorkFlowRegistry extends WorkFlowRegistry {
    registerCount = 0
    unregisterCount = 0

    override register(name: string, entity: WorkFlowInterface): void {
        this.registerCount++
        super.register(name, entity)
    }

    override unregister(name: string): void {
        this.unregisterCount++
        super.unregister(name)
    }
}

function buildWorkflow(id: string, name: string): WorkFlow {
    const wf = new WorkFlow(id, name)
    wf.addNode('input', new InputNode())
    return wf
}

const addEvent = { type: WATCHER_EVENT_TYPE.ADD, path: '/fake/path' } as const
const changeEvent = { type: WATCHER_EVENT_TYPE.CHANGE, path: '/fake/path' } as const
const unlinkEvent = { type: WATCHER_EVENT_TYPE.UNLINK, path: '/fake/path' } as const

describe('WorkFlowUpdater + WorkFlowRegistry (integration)', () => {
    let workflowRepository: InMemoryWorkFlowRepository
    let workflowRegistry: TrackingWorkFlowRegistry
    let updater: WorkFlowUpdater

    beforeEach(() => {
        workflowRepository = new InMemoryWorkFlowRepository()
        workflowRegistry = new TrackingWorkFlowRegistry()
        updater = new WorkFlowUpdater(workflowRepository, workflowRegistry, makeAgentRegistry())
    })

    describe('handle(ADD)', () => {
        it('loads all repository workflows into the registry', async () => {
            await workflowRepository.create(buildWorkflow('wf-1', 'First'))
            await workflowRepository.create(buildWorkflow('wf-2', 'Second'))

            await updater.handle(addEvent)

            expect(workflowRegistry.has('wf-1')).toBe(true)
            expect(workflowRegistry.has('wf-2')).toBe(true)
        })

        it('registers each workflow exactly once', async () => {
            await workflowRepository.create(buildWorkflow('wf-1', 'First'))

            await updater.handle(addEvent)

            expect(workflowRegistry.registerCount).toBe(1)
        })

        it('removes workflows from registry that are no longer in repository', async () => {
            await workflowRepository.create(buildWorkflow('wf-1', 'First'))
            await updater.handle(addEvent)
            expect(workflowRegistry.has('wf-1')).toBe(true)

            await workflowRepository.delete('wf-1')
            await updater.handle(addEvent)

            expect(workflowRegistry.has('wf-1')).toBe(false)
        })
    })

    describe('handle(CHANGE)', () => {
        it('skips re-registering when fingerprint is unchanged', async () => {
            const workflow = buildWorkflow('wf-same', 'Unchanged')
            await workflowRepository.create(workflow)

            await updater.handle(addEvent)
            const firstRegisterCount = workflowRegistry.registerCount

            await updater.handle(changeEvent)

            expect(workflowRegistry.registerCount).toBe(firstRegisterCount)
        })

        it('re-registers when workflow name changes', async () => {
            await workflowRepository.create(buildWorkflow('wf-upd', 'Original'))
            await updater.handle(addEvent)

            await workflowRepository.update('wf-upd', buildWorkflow('wf-upd', 'Updated'))
            await updater.handle(changeEvent)

            const registered = workflowRegistry.get('wf-upd')
            expect(registered?.name).toBe('Updated')
        })

        it('unregisters old entry before re-registering changed workflow', async () => {
            await workflowRepository.create(buildWorkflow('wf-chg', 'Before'))
            await updater.handle(addEvent)
            const unregisterBefore = workflowRegistry.unregisterCount

            await workflowRepository.update('wf-chg', buildWorkflow('wf-chg', 'After'))
            await updater.handle(changeEvent)

            expect(workflowRegistry.unregisterCount).toBeGreaterThan(unregisterBefore)
        })
    })

    describe('handle(UNLINK)', () => {
        it('clears all workflows from the registry', async () => {
            await workflowRepository.create(buildWorkflow('wf-1', 'First'))
            await workflowRepository.create(buildWorkflow('wf-2', 'Second'))
            await updater.handle(addEvent)

            await updater.handle(unlinkEvent)

            expect(workflowRegistry.list()).toHaveLength(0)
        })

        it('clears all fingerprints so next ADD re-registers everything', async () => {
            await workflowRepository.create(buildWorkflow('wf-1', 'First'))
            await updater.handle(addEvent)
            await updater.handle(unlinkEvent)

            const countBeforeReAdd = workflowRegistry.registerCount
            await updater.handle(addEvent)

            expect(workflowRegistry.registerCount).toBeGreaterThan(countBeforeReAdd)
        })

        it('leaves registry empty when called with no workflows registered', async () => {
            await updater.handle(unlinkEvent)

            expect(workflowRegistry.list()).toHaveLength(0)
        })
    })

    describe('agent workflow list cleanup', () => {
        it('removes a deleted workflow from every agent that had it registered', async () => {
            const workflow = buildWorkflow('wf-1', 'First')
            await workflowRepository.create(workflow)
            const agent = makeAgentInterface({ id: 'a1', workflows: [workflow] })
            const agentRegistry = makeAgentRegistry([agent])
            updater = new WorkFlowUpdater(workflowRepository, workflowRegistry, agentRegistry)
            await updater.handle(addEvent)

            await workflowRepository.delete('wf-1')
            await updater.handle(changeEvent)

            expect(agent.update).toHaveBeenCalledWith(expect.objectContaining({ workflows: [] }))
        })

        it('replaces a stale workflow reference with the updated object when the workflow changes', async () => {
            const original = buildWorkflow('wf-upd', 'Original')
            await workflowRepository.create(original)
            const agent = makeAgentInterface({ id: 'a1', workflows: [original] })
            const agentRegistry = makeAgentRegistry([agent])
            updater = new WorkFlowUpdater(workflowRepository, workflowRegistry, agentRegistry)
            await updater.handle(addEvent)

            const updated = buildWorkflow('wf-upd', 'Updated')
            await workflowRepository.update('wf-upd', updated)
            await updater.handle(changeEvent)

            expect(agent.update).toHaveBeenCalledWith(
                expect.objectContaining({ workflows: [expect.objectContaining({ name: 'Updated' })] })
            )
        })

        it('does not touch agents whose workflows are unaffected', async () => {
            const untouched = buildWorkflow('wf-keep', 'Keep')
            await workflowRepository.create(untouched)
            const agent = makeAgentInterface({ id: 'a1', workflows: [untouched] })
            const agentRegistry = makeAgentRegistry([agent])
            updater = new WorkFlowUpdater(workflowRepository, workflowRegistry, agentRegistry)
            await updater.handle(addEvent)
            ;(agent.update as jest.Mock).mockClear()

            await workflowRepository.create(buildWorkflow('wf-other', 'Other'))
            await updater.handle(changeEvent)

            expect(agent.update).not.toHaveBeenCalled()
        })

        it('skips agents whose config has no workflows field at all', async () => {
            const changed = buildWorkflow('wf-1', 'First')
            await workflowRepository.create(changed)
            const agentWithoutWorkflows = makeAgentInterface({ id: 'a1' })
            const agentRegistry = makeAgentRegistry([agentWithoutWorkflows])
            updater = new WorkFlowUpdater(workflowRepository, workflowRegistry, agentRegistry)
            await updater.handle(addEvent)

            await workflowRepository.update('wf-1', buildWorkflow('wf-1', 'Renamed'))
            await updater.handle(changeEvent)

            expect(agentWithoutWorkflows.update).not.toHaveBeenCalled()
        })

        it('falls back to the stale workflow reference when the registry has no entry for it', async () => {
            const workflow = buildWorkflow('wf-1', 'First')
            await workflowRepository.create(workflow)
            const agent = makeAgentInterface({ id: 'a1', workflows: [workflow] })
            const agentRegistry = makeAgentRegistry([agent])
            const nullGetRegistry = new NullGetWorkFlowRegistry()
            updater = new WorkFlowUpdater(workflowRepository, nullGetRegistry, agentRegistry)

            await updater.handle(addEvent)

            expect(agent.update).toHaveBeenCalledWith(expect.objectContaining({ workflows: [workflow] }))
        })

        it('clears every agent workflow list on UNLINK', async () => {
            const workflow = buildWorkflow('wf-1', 'First')
            await workflowRepository.create(workflow)
            const agent = makeAgentInterface({ id: 'a1', workflows: [workflow] })
            const agentRegistry = makeAgentRegistry([agent])
            updater = new WorkFlowUpdater(workflowRepository, workflowRegistry, agentRegistry)
            await updater.handle(addEvent)

            await updater.handle(unlinkEvent)

            expect(agent.update).toHaveBeenCalledWith({ workflows: [] })
        })

        it('skips agents that already have no workflows on UNLINK', async () => {
            const agentWithoutWorkflows = makeAgentInterface({ id: 'a1' })
            const agentRegistry = makeAgentRegistry([agentWithoutWorkflows])
            updater = new WorkFlowUpdater(workflowRepository, workflowRegistry, agentRegistry)

            await updater.handle(unlinkEvent)

            expect(agentWithoutWorkflows.update).not.toHaveBeenCalled()
        })
    })
})
