import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import {
    WorkFlow,
    WorkFlowRun,
    WorkFlowNodeRegistry,
    InputNode,
    TransformNode,
    WORKFLOW_RUN_STATUS,
    WorkFlowRunInterface,
    InputMapping,
    MappingValue
} from '@workflow'
import { JsonWorkFlowRunRepository } from '@workflow/repositories/JsonWorkFlowRunRepository'
import { NoopLogger } from '@logger'
import { makeTempDirPath, removeTempDir } from '../../../helpers/tempDir'

function buildNodeRegistry(): WorkFlowNodeRegistry {
    const registry = new WorkFlowNodeRegistry()
    registry.register('input', new InputNode())
    registry.register('transform', new TransformNode())
    return registry
}

function buildWorkflow(id: string): WorkFlow {
    const workflow = new WorkFlow(id, 'Test Workflow')
    workflow.addNode('start', new InputNode())
    workflow.addNode('step', new TransformNode())
    workflow.addConnection({
        id: 'c1',
        sourceNodeId: 'start',
        sourcePort: 'result',
        targetNodeId: 'step',
        targetPort: 'value'
    })
    return workflow
}

function buildRun(workflowId: string, input: unknown = 'hello'): WorkFlowRunInterface {
    const workflow = buildWorkflow(workflowId)
    return new WorkFlowRun(input, workflow)
}

describe('JsonWorkFlowRunRepository (integration)', () => {
    let testDir: string
    let repository: JsonWorkFlowRunRepository
    let registry: WorkFlowNodeRegistry

    beforeEach(() => {
        testDir = makeTempDirPath('wf-run-test')
        registry = buildNodeRegistry()
        repository = new JsonWorkFlowRunRepository(testDir, registry, new NoopLogger())
    })

    afterEach(async () => {
        await removeTempDir(testDir)
    })

    describe('findAll()', () => {
        it('returns empty array when directory does not exist yet', async () => {
            expect(await repository.findAll()).toEqual([])
        })

        it('returns all saved runs', async () => {
            await repository.create(buildRun('wf-1'))
            await repository.create(buildRun('wf-2'))
            await repository.create(buildRun('wf-3'))

            expect(await repository.findAll()).toHaveLength(3)
        })
    })

    describe('create() + findById()', () => {
        it('returns null for a non-existent run', async () => {
            expect(await repository.findById('no-such-run')).toBeNull()
        })

        it('persists a run and retrieves it by id', async () => {
            const run = buildRun('wf-a')
            await repository.create(run)

            const found = await repository.findById(run.id)
            expect(found).not.toBeNull()
        })

        it('restores the run id and workflowId', async () => {
            const run = buildRun('wf-b')
            await repository.create(run)

            const found = await repository.findById(run.id)
            expect(found?.id).toBe(run.id)
            expect(found?.workflowId).toBe('wf-b')
        })

        it('restores the status', async () => {
            const run = buildRun('wf-c')
            run.setStatus(WORKFLOW_RUN_STATUS.COMPLETED)
            await repository.create(run)

            const found = await repository.findById(run.id)
            expect(found?.status).toBe(WORKFLOW_RUN_STATUS.COMPLETED)
        })

        it('restores the input', async () => {
            const input = { message: 'hello world', count: 42 }
            const run = buildRun('wf-d', input)
            await repository.create(run)

            const found = await repository.findById(run.id)
            expect(found?.input).toEqual(input)
        })

        it('restores node entries with correct types', async () => {
            const run = buildRun('wf-e')
            await repository.create(run)

            const found = await repository.findById(run.id)
            const nodeTypes = found?.getEntries().map(e => e.node.type)
            expect(nodeTypes).toContain('input')
            expect(nodeTypes).toContain('transform')
        })

        it('restores connections between nodes', async () => {
            const run = buildRun('wf-f')
            await repository.create(run)

            const found = await repository.findById(run.id)
            expect(found?.getConnections()).toHaveLength(1)
        })

        it('restores createdAt timestamp', async () => {
            const run = buildRun('wf-g')
            await repository.create(run)

            const found = await repository.findById(run.id)
            expect(found?.createdAt).toBe(run.createdAt)
        })

        it('returns the created run from create()', async () => {
            const run = buildRun('wf-h')
            const result = await repository.create(run)

            expect(result.id).toBe(run.id)
        })

        it('returns null and skips a file with invalid JSON', async () => {
            await mkdir(testDir, { recursive: true })
            await writeFile(join(testDir, 'run-broken.json'), 'not json', 'utf-8')

            expect(await repository.findById('run-broken')).toBeNull()
        })

        it('returns null and skips a file that fails schema validation', async () => {
            await mkdir(testDir, { recursive: true })
            await writeFile(join(testDir, 'run-invalid.json'), JSON.stringify({ id: 'run-invalid' }), 'utf-8')

            expect(await repository.findById('run-invalid')).toBeNull()
        })

        it('returns null and skips a schema-valid file referencing an unregistered node type', async () => {
            await mkdir(testDir, { recursive: true })
            const serialized = {
                id: 'run-unknown-node',
                workflowId: 'wf-unknown-node',
                status: WORKFLOW_RUN_STATUS.COMPLETED,
                input: null,
                entries: [
                    {
                        id: 'a',
                        nodeType: 'does-not-exist',
                        portMappings: {},
                        configOverrides: {},
                        executions: {}
                    }
                ],
                connections: [],
                createdAt: Date.now(),
                updatedAt: Date.now()
            }
            await writeFile(join(testDir, 'run-unknown-node.json'), JSON.stringify(serialized), 'utf-8')

            expect(await repository.findById('run-unknown-node')).toBeNull()
        })

        it('restores an entry with an empty port mappings array without setting any mapping', async () => {
            await mkdir(testDir, { recursive: true })
            const serialized = {
                id: 'run-empty-mapping',
                workflowId: 'wf-empty-mapping',
                status: WORKFLOW_RUN_STATUS.COMPLETED,
                input: null,
                entries: [
                    {
                        id: 'input',
                        nodeType: 'input',
                        portMappings: { result: [] },
                        configOverrides: {},
                        executions: {}
                    }
                ],
                connections: [],
                createdAt: Date.now(),
                updatedAt: Date.now()
            }
            await writeFile(join(testDir, 'run-empty-mapping.json'), JSON.stringify(serialized), 'utf-8')

            const found = await repository.findById('run-empty-mapping')
            const entry = found?.getEntries().find(e => e.id === 'input')
            expect(entry?.portMappings['result']).toBeUndefined()
        })
    })

    describe('update()', () => {
        it('overwrites the persisted run with updated data', async () => {
            const run = buildRun('wf-upd')
            await repository.create(run)

            run.setStatus(WORKFLOW_RUN_STATUS.FAILED)
            await repository.update(run.id, run)

            const found = await repository.findById(run.id)
            expect(found?.status).toBe(WORKFLOW_RUN_STATUS.FAILED)
        })

        it('returns the updated run', async () => {
            const run = buildRun('wf-ret')
            await repository.create(run)

            const result = await repository.update(run.id, run)
            expect(result.id).toBe(run.id)
        })
    })

    describe('portMappings serialization', () => {
        it('round-trips constant port mappings through create and findById', async () => {
            const workflow = buildWorkflow('wf-pm')
            const mapping: InputMapping = { targetParameter: 'x', value: { type: 'constant', data: 'hello' } }
            workflow.setPortMapping('step', 'value', [mapping])
            const run = new WorkFlowRun('input', workflow)

            await repository.create(run)
            const found = await repository.findById(run.id)

            const stepEntry = found?.getEntries().find(e => e.id === 'step')
            expect(stepEntry?.portMappings['value']).toHaveLength(1)
        })

        it('round-trips expression port mappings', async () => {
            const workflow = buildWorkflow('wf-pm-expr')
            const mapping: InputMapping = {
                targetParameter: 'y',
                value: { type: 'expression', expression: '$input.x' }
            }
            workflow.setPortMapping('step', 'value', [mapping])
            const run = new WorkFlowRun('input', workflow)

            await repository.create(run)
            const found = await repository.findById(run.id)

            const stepEntry = found?.getEntries().find(e => e.id === 'step')
            const storedMapping = stepEntry?.portMappings['value']?.[0]
            expect(storedMapping?.value.type).toBe('expression')
        })

        it('excludes function-type mappings from serialization', async () => {
            const workflow = buildWorkflow('wf-pm-fn')
            const fnMapping: InputMapping = {
                targetParameter: 'z',
                value: { type: 'function', fn: () => 'computed' } as MappingValue
            }
            workflow.setPortMapping('step', 'value', [fnMapping])
            const run = new WorkFlowRun('input', workflow)

            await repository.create(run)
            const found = await repository.findById(run.id)

            const stepEntry = found?.getEntries().find(e => e.id === 'step')
            expect(stepEntry?.portMappings['value'] ?? []).toHaveLength(0)
        })

        it('omits port entirely when all its mappings are function-type', async () => {
            const workflow = buildWorkflow('wf-pm-fn-only')
            const fnMapping: InputMapping = {
                targetParameter: 'z',
                value: { type: 'function', fn: () => 'x' } as MappingValue
            }
            workflow.setPortMapping('step', 'value', [fnMapping])
            const run = new WorkFlowRun('input', workflow)

            await repository.create(run)
            const found = await repository.findById(run.id)

            const stepEntry = found?.getEntries().find(e => e.id === 'step')
            expect(stepEntry?.portMappings['value']).toBeUndefined()
        })
    })

    describe('configOverrides serialization', () => {
        it('round-trips constant configOverrides', async () => {
            const workflow = buildWorkflow('wf-cfg')
            workflow.setConfigOverride('step', 'expression', { type: 'constant', data: 'upper' })
            const run = new WorkFlowRun('input', workflow)

            await repository.create(run)
            const found = await repository.findById(run.id)

            const stepEntry = found?.getEntries().find(e => e.id === 'step')
            expect(stepEntry?.configOverrides['expression']).toEqual({ type: 'constant', data: 'upper' })
        })

        it('round-trips expression configOverrides', async () => {
            const workflow = buildWorkflow('wf-cfg-expr')
            workflow.setConfigOverride('step', 'expression', { type: 'expression', expression: '$input.toUpperCase()' })
            const run = new WorkFlowRun('input', workflow)

            await repository.create(run)
            const found = await repository.findById(run.id)

            const stepEntry = found?.getEntries().find(e => e.id === 'step')
            const override = stepEntry?.configOverrides['expression']
            expect(override?.type).toBe('expression')
        })

        it('excludes function-type configOverrides from serialization', async () => {
            const workflow = buildWorkflow('wf-cfg-fn')
            workflow.setConfigOverride('step', 'computedKey', { type: 'function', fn: () => 'value' } as MappingValue)
            const run = new WorkFlowRun('input', workflow)

            await repository.create(run)
            const found = await repository.findById(run.id)

            const stepEntry = found?.getEntries().find(e => e.id === 'step')
            expect(stepEntry?.configOverrides['computedKey']).toBeUndefined()
        })
    })

    describe('delete()', () => {
        it('removes the run so findById returns null', async () => {
            const run = buildRun('wf-del')
            await repository.create(run)

            await repository.delete(run.id)
            expect(await repository.findById(run.id)).toBeNull()
        })

        it('excludes deleted run from findAll results', async () => {
            const keep = buildRun('wf-keep')
            const remove = buildRun('wf-remove')
            await repository.create(keep)
            await repository.create(remove)

            await repository.delete(remove.id)
            const all = await repository.findAll()
            expect(all).toHaveLength(1)
            expect(all[0]?.id).toBe(keep.id)
        })
    })
})
