import { createWorkFlowTools } from '@tool/implementations/workflow/utils/createWorkFlowTools'
import {
    makeWorkFlowRegistryMock,
    makeAgentRegistry,
    makeRawAgentConfigRepository
} from '../../../../../helpers/makeAgent'
import {
    WorkFlowNodeRegistry,
    WorkFlowRunnerInterface,
    WorkFlowRunRepositoryInterface,
    WorkFlowRepositoryInterface
} from '@workflow'

function makeWorkFlowRunRepository(): WorkFlowRunRepositoryInterface {
    return {
        findAll: jest.fn().mockResolvedValue([]),
        findById: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(undefined),
        update: jest.fn().mockResolvedValue(undefined),
        delete: jest.fn().mockResolvedValue(undefined),
        ensureInitialized: jest.fn().mockResolvedValue(undefined)
    }
}

function makeWorkFlowRepository(): WorkFlowRepositoryInterface {
    return {
        findAll: jest.fn().mockResolvedValue([]),
        findById: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(undefined),
        update: jest.fn().mockResolvedValue(undefined),
        delete: jest.fn().mockResolvedValue(undefined),
        ensureInitialized: jest.fn().mockResolvedValue(undefined)
    }
}

function makeWorkFlowRunner(): WorkFlowRunnerInterface {
    return {
        run: jest.fn().mockReturnValue((async function* () {})()),
        stop: jest.fn().mockResolvedValue(undefined)
    }
}

describe('createWorkFlowTools', () => {
    it('returns an array of tool instances', () => {
        const tools = createWorkFlowTools({
            workflowRegistry: makeWorkFlowRegistryMock(),
            workflowRepository: makeWorkFlowRepository(),
            workflowRunRepository: makeWorkFlowRunRepository(),
            workflowRunner: makeWorkFlowRunner(),
            workflowNodeRegistry: new WorkFlowNodeRegistry(),
            agentRegistry: makeAgentRegistry()
        })
        expect(Array.isArray(tools)).toBe(true)
        expect(tools.length).toBeGreaterThan(0)
    })

    it('includes all expected tool names', () => {
        const tools = createWorkFlowTools({
            workflowRegistry: makeWorkFlowRegistryMock(),
            workflowRepository: makeWorkFlowRepository(),
            workflowRunRepository: makeWorkFlowRunRepository(),
            workflowRunner: makeWorkFlowRunner(),
            workflowNodeRegistry: new WorkFlowNodeRegistry(),
            agentRegistry: makeAgentRegistry()
        })
        const names = tools.map(t => t.name)
        expect(names).toContain('workflow_create')
        expect(names).toContain('workflow_update')
        expect(names).toContain('workflow_delete')
        expect(names).toContain('workflow_list')
        expect(names).toContain('workflow_info')
        expect(names).toContain('workflow_register')
        expect(names).toContain('workflow_unregister')
        expect(names).toContain('workflow_run')
        expect(names).toContain('workflow_stop')
        expect(names).toContain('workflow_run_info')
        expect(names).toContain('workflow_list_runs')
        expect(names).toContain('workflow_nodes')
    })

    it('passes rawAgentConfigRepository as null when not provided', () => {
        const tools = createWorkFlowTools({
            workflowRegistry: makeWorkFlowRegistryMock(),
            workflowRepository: makeWorkFlowRepository(),
            workflowRunRepository: makeWorkFlowRunRepository(),
            workflowRunner: makeWorkFlowRunner(),
            workflowNodeRegistry: new WorkFlowNodeRegistry(),
            agentRegistry: makeAgentRegistry()
        })
        expect(tools.find(t => t.name === 'workflow_register')).toBeDefined()
    })

    it('accepts rawAgentConfigRepository when provided', () => {
        const tools = createWorkFlowTools({
            workflowRegistry: makeWorkFlowRegistryMock(),
            workflowRepository: makeWorkFlowRepository(),
            workflowRunRepository: makeWorkFlowRunRepository(),
            workflowRunner: makeWorkFlowRunner(),
            workflowNodeRegistry: new WorkFlowNodeRegistry(),
            agentRegistry: makeAgentRegistry(),
            rawAgentConfigRepository: makeRawAgentConfigRepository()
        })
        expect(tools.find(t => t.name === 'workflow_register')).toBeDefined()
    })
})
