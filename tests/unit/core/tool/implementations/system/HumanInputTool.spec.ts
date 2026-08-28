import { HumanInputTool } from '@tool/implementations/system/HumanInputTool'
import { AgentToolError } from '@tool/errors'
import { AgentTimeoutError } from '@agent/errors/AgentTimeoutError'

describe('HumanInputTool', () => {
    let tool: HumanInputTool

    beforeEach(() => {
        jest.useFakeTimers()
        tool = new HumanInputTool()
    })

    afterEach(() => {
        jest.useRealTimers()
    })

    describe('name and description', () => {
        it('has name "human_input"', () => {
            expect(tool.name).toBe('human_input')
        })

        it('has a description', () => {
            expect(tool.description.length).toBeGreaterThan(0)
        })
    })

    describe('execute() argument validation', () => {
        it('throws AgentToolError when question is missing', async () => {
            await expect(tool.execute({}, 'agent', 'session')).rejects.toThrow(AgentToolError)
        })
    })

    describe('isWaiting()', () => {
        it('returns false before execute is called', () => {
            expect(tool.isWaiting('session-1')).toBe(false)
        })

        it('returns true after execute is called', () => {
            void tool.execute({ question: 'What?' }, 'agent', 'session-1')
            expect(tool.isWaiting('session-1')).toBe(true)
        })

        it('returns false after respond is called', () => {
            void tool.execute({ question: 'What?' }, 'agent', 'session-1')
            tool.respond('session-1', 'yes')
            expect(tool.isWaiting('session-1')).toBe(false)
        })
    })

    describe('respond()', () => {
        it('resolves the pending promise with the answer', async () => {
            const promise = tool.execute({ question: 'What is 2+2?' }, 'agent', 'session-1')
            tool.respond('session-1', '4')
            await expect(promise).resolves.toBe('4')
        })

        it('is a no-op when called for an unknown session', () => {
            expect(() => {
                tool.respond('unknown', 'anything')
            }).not.toThrow()
        })

        it('does not affect other sessions', async () => {
            const p1 = tool.execute({ question: 'Q1' }, 'agent', 'session-1')
            const p2 = tool.execute({ question: 'Q2' }, 'agent', 'session-2')
            tool.respond('session-1', 'answer-1')
            await expect(p1).resolves.toBe('answer-1')
            expect(tool.isWaiting('session-2')).toBe(true)
            tool.respond('session-2', 'answer-2')
            await expect(p2).resolves.toBe('answer-2')
        })
    })

    describe('timeout', () => {
        it('rejects with AgentTimeoutError after timeoutMs', async () => {
            const promise = tool.execute({ question: 'Q?', timeoutMs: 1000 }, 'agent', 'session-1')
            promise.catch(() => {})
            jest.advanceTimersByTime(1001)
            await expect(promise).rejects.toBeInstanceOf(AgentTimeoutError)
        })

        it('clears the pending entry when timeout fires', async () => {
            const promise = tool.execute({ question: 'Q?', timeoutMs: 500 }, 'agent', 'session-1')
            promise.catch(() => {})
            jest.advanceTimersByTime(600)
            await expect(promise).rejects.toThrow()
            expect(tool.isWaiting('session-1')).toBe(false)
        })
    })
})
