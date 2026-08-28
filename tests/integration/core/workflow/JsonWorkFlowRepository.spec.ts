import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { WorkFlow, WorkFlowNodeRegistry, InputNode, TransformNode, WorkFlowNodeNotFoundError } from '@workflow'
import { JsonWorkFlowRepository } from '@workflow/repositories/JsonWorkFlowRepository'
import { NoopLogger } from '@logger'
import { makeTempDirPath, removeTempDir } from '../../../helpers/tempDir'

function buildNodeRegistry(): WorkFlowNodeRegistry {
    const registry = new WorkFlowNodeRegistry()
    registry.register('input', new InputNode())
    registry.register('transform', new TransformNode())
    return registry
}

function buildWorkflow(id: string, name: string): WorkFlow {
    const workflow = new WorkFlow(id, name)
    workflow.addNode('input', new InputNode())
    workflow.addNode('transform', new TransformNode())
    workflow.addConnection({
        id: 'c1',
        sourceNodeId: 'input',
        sourcePort: 'result',
        targetNodeId: 'transform',
        targetPort: 'value'
    })
    workflow.setConfigOverride('transform', 'expression', { type: 'constant', data: '$input' })
    return workflow
}

describe('JsonWorkFlowRepository (integration)', () => {
    let testDir: string
    let repository: JsonWorkFlowRepository
    let registry: WorkFlowNodeRegistry

    beforeEach(() => {
        testDir = makeTempDirPath('wf-repo-test')
        registry = buildNodeRegistry()
        repository = new JsonWorkFlowRepository(testDir, registry, new NoopLogger())
    })

    afterEach(async () => {
        await removeTempDir(testDir)
    })

    describe('create()', () => {
        it('persists a workflow to disk', async () => {
            const workflow = buildWorkflow('wf-1', 'First Workflow')
            await repository.create(workflow)

            const found = await repository.findById('wf-1')
            expect(found).not.toBeNull()
        })

        it('returns the created workflow', async () => {
            const workflow = buildWorkflow('wf-2', 'Second Workflow')
            const result = await repository.create(workflow)

            expect(result.id).toBe('wf-2')
            expect(result.name).toBe('Second Workflow')
        })
    })

    describe('findById()', () => {
        it('returns null for a non-existent workflow', async () => {
            expect(await repository.findById('does-not-exist')).toBeNull()
        })

        it('reconstructs node connections from the saved file', async () => {
            await repository.create(buildWorkflow('wf-conn', 'Conn Test'))
            const found = await repository.findById('wf-conn')

            expect(found?.getConnections()).toHaveLength(1)
        })

        it('reconstructs nodes with their types', async () => {
            await repository.create(buildWorkflow('wf-nodes', 'Nodes Test'))
            const found = await repository.findById('wf-nodes')

            const types = found?.getEntries().map(e => e.node.type)
            expect(types).toContain('input')
            expect(types).toContain('transform')
        })

        it('restores configOverrides from the saved file', async () => {
            await repository.create(buildWorkflow('wf-cfg', 'Config Test'))
            const found = await repository.findById('wf-cfg')

            const transformEntry = found?.getEntries().find(e => e.id === 'transform')
            expect(transformEntry?.configOverrides['expression']).toEqual({ type: 'constant', data: '$input' })
        })

        it('returns null and skips a file with invalid JSON', async () => {
            await mkdir(testDir, { recursive: true })
            await writeFile(join(testDir, 'wf-broken.json'), 'not json', 'utf-8')

            expect(await repository.findById('wf-broken')).toBeNull()
        })

        it('returns null and skips a file that fails schema validation', async () => {
            await mkdir(testDir, { recursive: true })
            await writeFile(join(testDir, 'wf-invalid.json'), JSON.stringify({ id: 'wf-invalid' }), 'utf-8')

            expect(await repository.findById('wf-invalid')).toBeNull()
        })

        it('returns null and skips a schema-valid file referencing an unregistered node type', async () => {
            await mkdir(testDir, { recursive: true })
            const serialized = {
                id: 'wf-unknown-node',
                name: 'Unknown Node',
                entries: [{ id: 'a', nodeType: 'does-not-exist', portMappings: {}, configOverrides: {} }],
                connections: []
            }
            await writeFile(join(testDir, 'wf-unknown-node.json'), JSON.stringify(serialized), 'utf-8')

            expect(await repository.findById('wf-unknown-node')).toBeNull()
        })
    })

    describe('findAll()', () => {
        it('returns empty array when directory has no JSON files', async () => {
            expect(await repository.findAll()).toEqual([])
        })

        it('returns all saved workflows', async () => {
            await repository.create(buildWorkflow('wf-a', 'A'))
            await repository.create(buildWorkflow('wf-b', 'B'))
            await repository.create(buildWorkflow('wf-c', 'C'))

            const all = await repository.findAll()
            expect(all).toHaveLength(3)
        })

        it('returns only workflows whose node types are in the registry', async () => {
            await repository.create(buildWorkflow('wf-valid', 'Valid'))
            await repository.create(buildWorkflow('wf-valid-2', 'Valid 2'))

            const all = await repository.findAll()
            const ids = all.map(wf => wf.id)
            expect(ids).toContain('wf-valid')
            expect(ids).toContain('wf-valid-2')
        })
    })

    describe('update()', () => {
        it('overwrites an existing workflow file', async () => {
            await repository.create(buildWorkflow('wf-upd', 'Original'))

            const updated = new WorkFlow('wf-upd', 'Updated Name')
            updated.addNode('input', new InputNode())
            await repository.update('wf-upd', updated)

            const found = await repository.findById('wf-upd')
            expect(found?.name).toBe('Updated Name')
        })

        it('throws WorkFlowNodeNotFoundError when workflow does not exist', async () => {
            const workflow = buildWorkflow('missing', 'Missing')
            await expect(repository.update('missing', workflow)).rejects.toBeInstanceOf(WorkFlowNodeNotFoundError)
        })
    })

    describe('delete()', () => {
        it('removes the workflow file from disk', async () => {
            await repository.create(buildWorkflow('wf-del', 'Delete Me'))
            await repository.delete('wf-del')

            expect(await repository.findById('wf-del')).toBeNull()
        })

        it('excluded deleted workflow from findAll results', async () => {
            await repository.create(buildWorkflow('wf-keep', 'Keep'))
            await repository.create(buildWorkflow('wf-remove', 'Remove'))
            await repository.delete('wf-remove')

            const all = await repository.findAll()
            expect(all).toHaveLength(1)
            expect(all[0]?.id).toBe('wf-keep')
        })
    })
})
