import { WorkFlowAdapter } from '@tool/implementations/adapter/WorkFlowAdapter'
import { AgentToolError } from '@tool/errors/AgentToolError'
import {
    WorkFlowRunnerInterface,
    WorkFlowRunInterface,
    WorkFlowEvent,
    WORKFLOW_RUN_STATUS,
    WORKFLOW_EVENT_TYPE,
    WorkFlow,
    InputNode
} from '@workflow'

function makeWorkFlow(id = 'wf-1', name = 'Test WF', description?: string): WorkFlow {
    const wf = new WorkFlow(id, name, description)
    wf.addNode('start', new InputNode())
    return wf
}

function makeRunner(events: Array<Partial<WorkFlowEvent>> = [], failStatus = false): WorkFlowRunnerInterface {
    return {
        run: jest.fn().mockImplementation(function* (run: WorkFlowRunInterface) {
            if (failStatus) run.setStatus(WORKFLOW_RUN_STATUS.FAILED)
            for (const event of events) yield event
        }),
        stop: jest.fn().mockResolvedValue(undefined)
    }
}

describe('WorkFlowAdapter', () => {
    describe('constructor', () => {
        it('sets name to "workflow__<id>"', () => {
            const adapter = new WorkFlowAdapter(makeWorkFlow('abc'), makeRunner())
            expect(adapter.name).toBe('workflow__abc')
        })

        it('includes description in tool description when workflow has one', () => {
            const adapter = new WorkFlowAdapter(makeWorkFlow('wf-1', 'My WF', 'Does something cool'), makeRunner())
            expect(adapter.description).toContain('Does something cool')
        })

        it('uses fallback description when workflow has no description', () => {
            const adapter = new WorkFlowAdapter(makeWorkFlow('wf-1', 'My WF'), makeRunner())
            expect(adapter.description).toContain('My WF')
            expect(adapter.description).not.toContain('undefined')
        })

        it('exposes parameters with "input" as required field', () => {
            const adapter = new WorkFlowAdapter(makeWorkFlow(), makeRunner())
            const params = adapter.parameters as {
                required: Array<string>
                properties: Record<string, unknown>
            }
            expect(params.required).toContain('input')
            expect(params.properties['input']).toBeDefined()
        })
    })

    describe('execute()', () => {
        it('throws AgentToolError when "input" key is missing from args', async () => {
            const adapter = new WorkFlowAdapter(makeWorkFlow(), makeRunner())
            await expect(adapter.execute({})).rejects.toThrow(AgentToolError)
        })

        it('accepts null as input', async () => {
            const adapter = new WorkFlowAdapter(makeWorkFlow(), makeRunner())
            await expect(adapter.execute({ input: null })).resolves.toBeDefined()
        })

        it('calls runner.run with a WorkFlowRun', async () => {
            const runner = makeRunner()
            const adapter = new WorkFlowAdapter(makeWorkFlow(), runner)
            await adapter.execute({ input: 'hello' })
            expect(runner.run).toHaveBeenCalledTimes(1)
        })

        it('returns workflow output on success', async () => {
            const runner = makeRunner()
            const adapter = new WorkFlowAdapter(makeWorkFlow(), runner)
            const result = await adapter.execute({ input: null })
            expect(result).toBeDefined()
        })

        it('ignores non-RUN_FAILED events while draining the run', async () => {
            const runner = makeRunner([{ type: WORKFLOW_EVENT_TYPE.RUN_STARTED } as WorkFlowEvent])
            const adapter = new WorkFlowAdapter(makeWorkFlow(), runner)
            await expect(adapter.execute({ input: null })).resolves.toBeDefined()
        })

        it('throws AgentToolError when run status is FAILED', async () => {
            const runner = makeRunner([], true)
            const adapter = new WorkFlowAdapter(makeWorkFlow('wf-1', 'My WF'), runner)
            await expect(adapter.execute({ input: null })).rejects.toThrow(AgentToolError)
        })

        it('includes failure reason in error when RUN_FAILED event has error', async () => {
            const runner = makeRunner(
                [{ type: WORKFLOW_EVENT_TYPE.RUN_FAILED, error: 'out of memory' } as WorkFlowEvent],
                true
            )
            const adapter = new WorkFlowAdapter(makeWorkFlow(), runner)
            let message = ''
            try {
                await adapter.execute({ input: null })
            } catch (e) {
                if (e instanceof AgentToolError) message = e.message
            }
            expect(message).toContain('out of memory')
        })

        it('throws AgentToolError without a reason suffix when no RUN_FAILED event was yielded', async () => {
            const runner = makeRunner([], true)
            const adapter = new WorkFlowAdapter(makeWorkFlow('w', 'My WF'), runner)
            let message = ''
            try {
                await adapter.execute({ input: null })
            } catch (e) {
                if (e instanceof AgentToolError) message = e.message
            }
            expect(message).toBe('WorkFlow "My WF" failed')
        })
    })
})
