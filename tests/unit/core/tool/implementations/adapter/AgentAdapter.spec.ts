import { AgentAdapter } from '@tool/implementations/adapter/AgentAdapter'
import { AgentToolError } from '@tool/errors'
import { AGENT_EVENT_TYPE, AgentEvent } from '@agent/types'
import { makeAgentInterface, makeSessionManager } from '../../../../../helpers/makeAgent'
import { toAsyncIterable } from '../../../../../helpers/toAsyncIterable'

function baseFields() {
    return { id: 'evt', agentId: 'sub-agent', sessionId: 'sub-session', createdAt: 0 }
}

function messageEvent(message: string): AgentEvent {
    return { ...baseFields(), type: AGENT_EVENT_TYPE.MESSAGE, message }
}

function structuredOutputEvent(output: unknown): AgentEvent {
    return { ...baseFields(), type: AGENT_EVENT_TYPE.STRUCTURED_OUTPUT, output }
}

function errorEvent(error: string, recoverable: boolean): AgentEvent {
    return { ...baseFields(), type: AGENT_EVENT_TYPE.ERROR, error, recoverable }
}

describe('AgentAdapter', () => {
    describe('constructor', () => {
        it('prefixes the agent name with agent__', () => {
            const agent = makeAgentInterface({ name: 'Helper' })
            const adapter = new AgentAdapter(agent, makeSessionManager())
            expect(adapter.name).toBe('agent__Helper')
        })

        it('includes the agent name in the description', () => {
            const agent = makeAgentInterface({ name: 'Helper' })
            const adapter = new AgentAdapter(agent, makeSessionManager())
            expect(adapter.description).toContain('Helper')
        })

        it('includes the agent description when provided', () => {
            const agent = makeAgentInterface({ name: 'Helper', description: 'Handles support tickets' })
            const adapter = new AgentAdapter(agent, makeSessionManager())
            expect(adapter.description).toContain('Handles support tickets')
        })

        it('uses a fallback description when none is provided', () => {
            const agent = makeAgentInterface({ name: 'Helper' })
            const adapter = new AgentAdapter(agent, makeSessionManager())
            expect(adapter.description).toContain('No description provided')
        })

        it('uses a fallback description when the provided one is blank', () => {
            const agent = makeAgentInterface({ name: 'Helper', description: '   ' })
            const adapter = new AgentAdapter(agent, makeSessionManager())
            expect(adapter.description).toContain('No description provided')
        })

        it('requires "task" in the parameters schema', () => {
            const agent = makeAgentInterface()
            const adapter = new AgentAdapter(agent, makeSessionManager())
            const params = adapter.parameters as { required: Array<string> }
            expect(params.required).toEqual(['task'])
        })
    })

    describe('execute() argument validation', () => {
        it('throws AgentToolError when task is missing', async () => {
            const agent = makeAgentInterface()
            const adapter = new AgentAdapter(agent, makeSessionManager())
            await expect(adapter.execute({}, 'agent-1', 'session-1')).rejects.toThrow(AgentToolError)
        })

        it('throws AgentToolError when task is not a string', async () => {
            const agent = makeAgentInterface()
            const adapter = new AgentAdapter(agent, makeSessionManager())
            await expect(adapter.execute({ task: 42 }, 'agent-1', 'session-1')).rejects.toThrow(AgentToolError)
        })

        it('throws AgentToolError when task is a blank string', async () => {
            const agent = makeAgentInterface()
            const adapter = new AgentAdapter(agent, makeSessionManager())
            await expect(adapter.execute({ task: '   ' }, 'agent-1', 'session-1')).rejects.toThrow(AgentToolError)
        })

        it('throws AgentToolError when outputSchema is not an object', async () => {
            const agent = makeAgentInterface()
            agent.run = jest.fn().mockReturnValue(toAsyncIterable([messageEvent('done')]))
            const adapter = new AgentAdapter(agent, makeSessionManager())
            await expect(
                adapter.execute({ task: 'do it', outputSchema: 'not-an-object' }, 'agent-1', 'session-1')
            ).rejects.toThrow(AgentToolError)
        })

        it('throws AgentToolError when outputSchema is an array', async () => {
            const agent = makeAgentInterface()
            const adapter = new AgentAdapter(agent, makeSessionManager())
            await expect(adapter.execute({ task: 'do it', outputSchema: [] }, 'agent-1', 'session-1')).rejects.toThrow(
                AgentToolError
            )
        })
    })

    describe('execute() session lifecycle', () => {
        it('creates a sub-session referencing the agent name and parent session id', async () => {
            const agent = makeAgentInterface({ name: 'Helper' })
            agent.run = jest.fn().mockReturnValue(toAsyncIterable([messageEvent('done')]))
            const sessionManager = makeSessionManager()
            const adapter = new AgentAdapter(agent, sessionManager)

            await adapter.execute({ task: 'do it' }, 'agent-1', 'parent-session')

            expect(sessionManager.create).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({ title: expect.stringContaining('Helper') })
            )
            const [, options] = (sessionManager.create as jest.Mock).mock.calls[0] as [string, { title: string }]
            expect(options.title).toContain('parent-session')
        })

        it('deletes the sub-session after a successful run', async () => {
            const agent = makeAgentInterface()
            agent.run = jest.fn().mockReturnValue(toAsyncIterable([messageEvent('done')]))
            const sessionManager = makeSessionManager()
            const adapter = new AgentAdapter(agent, sessionManager)

            await adapter.execute({ task: 'do it' }, 'agent-1', 'session-1')

            expect(sessionManager.delete).toHaveBeenCalledTimes(1)
        })

        it('deletes the sub-session even when the run throws', async () => {
            const agent = makeAgentInterface()
            agent.run = jest.fn().mockReturnValue(toAsyncIterable([errorEvent('boom', false)]))
            const sessionManager = makeSessionManager()
            const adapter = new AgentAdapter(agent, sessionManager)

            await expect(adapter.execute({ task: 'do it' }, 'agent-1', 'session-1')).rejects.toThrow(AgentToolError)
            expect(sessionManager.delete).toHaveBeenCalledTimes(1)
        })
    })

    describe('execute() guardrail policy', () => {
        it('runs the sub-agent with SAFE_SKIP input/output and FAIL toolCall guardrail policy', async () => {
            const agent = makeAgentInterface()
            agent.run = jest.fn().mockReturnValue(toAsyncIterable([messageEvent('done')]))
            const adapter = new AgentAdapter(agent, makeSessionManager())

            await adapter.execute({ task: 'do it' }, 'agent-1', 'session-1')

            const [, , options] = (agent.run as jest.Mock).mock.calls[0] as [
                string,
                unknown,
                { guardrailPolicy: unknown }
            ]
            expect(options.guardrailPolicy).toEqual({
                input: 'safe_skip',
                output: 'safe_skip',
                toolCall: 'fail'
            })
        })

        it('passes outputSchema through to AgentRunOptions when provided', async () => {
            const agent = makeAgentInterface()
            agent.run = jest.fn().mockReturnValue(toAsyncIterable([messageEvent('done')]))
            const adapter = new AgentAdapter(agent, makeSessionManager())
            const schema = { type: 'object', properties: {} }

            await adapter.execute({ task: 'do it', outputSchema: schema }, 'agent-1', 'session-1')

            const [, , options] = (agent.run as jest.Mock).mock.calls[0] as [string, unknown, { outputSchema: unknown }]
            expect(options.outputSchema).toBe(schema)
        })

        it('omits outputSchema from AgentRunOptions when not provided', async () => {
            const agent = makeAgentInterface()
            agent.run = jest.fn().mockReturnValue(toAsyncIterable([messageEvent('done')]))
            const adapter = new AgentAdapter(agent, makeSessionManager())

            await adapter.execute({ task: 'do it' }, 'agent-1', 'session-1')

            const [, , options] = (agent.run as jest.Mock).mock.calls[0] as [string, unknown, Record<string, unknown>]
            expect('outputSchema' in options).toBe(false)
        })
    })

    describe('execute() result extraction', () => {
        it('returns the structured output when a STRUCTURED_OUTPUT event is emitted', async () => {
            const agent = makeAgentInterface()
            agent.run = jest
                .fn()
                .mockReturnValue(toAsyncIterable([messageEvent('ignored text'), structuredOutputEvent({ ok: true })]))
            const adapter = new AgentAdapter(agent, makeSessionManager())

            const result = await adapter.execute({ task: 'do it' }, 'agent-1', 'session-1')

            expect(result).toEqual({ ok: true })
        })

        it('returns the last message when no structured output is emitted', async () => {
            const agent = makeAgentInterface()
            agent.run = jest.fn().mockReturnValue(toAsyncIterable([messageEvent('first'), messageEvent('second')]))
            const adapter = new AgentAdapter(agent, makeSessionManager())

            const result = await adapter.execute({ task: 'do it' }, 'agent-1', 'session-1')

            expect(result).toBe('second')
        })

        it('throws AgentToolError when the run produces no message and no structured output', async () => {
            const agent = makeAgentInterface()
            agent.run = jest.fn().mockReturnValue(toAsyncIterable([]))
            const adapter = new AgentAdapter(agent, makeSessionManager())

            await expect(adapter.execute({ task: 'do it' }, 'agent-1', 'session-1')).rejects.toThrow(
                'completed without producing any result'
            )
        })

        it('throws AgentToolError when an unrecoverable ERROR event is emitted', async () => {
            const agent = makeAgentInterface({ name: 'Helper' })
            agent.run = jest.fn().mockReturnValue(toAsyncIterable([errorEvent('disk full', false)]))
            const adapter = new AgentAdapter(agent, makeSessionManager())

            await expect(adapter.execute({ task: 'do it' }, 'agent-1', 'session-1')).rejects.toThrow(/disk full/)
        })

        it('does not throw on a recoverable ERROR event and continues processing', async () => {
            const agent = makeAgentInterface()
            agent.run = jest
                .fn()
                .mockReturnValue(toAsyncIterable([errorEvent('retrying', true), messageEvent('recovered')]))
            const adapter = new AgentAdapter(agent, makeSessionManager())

            const result = await adapter.execute({ task: 'do it' }, 'agent-1', 'session-1')

            expect(result).toBe('recovered')
        })
    })
})
