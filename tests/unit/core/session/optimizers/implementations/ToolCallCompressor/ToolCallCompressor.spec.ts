import { ToolCallCompressor } from '@session/optimizers/implementations/ToolCallCompressor'
import { AgentMessage } from '@agent/types/AgentMessage'
import { CONTENT_TYPE } from '@provider/types/ContentType'
import { MESSAGE_ROLE } from '@provider/types/MessageRole'
import { Usage } from '@provider'

function makeUsage(totalTokens: number): Usage {
    return {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens
    }
}

function makeTextMessage(
    id: string,
    role: (typeof MESSAGE_ROLE)[keyof typeof MESSAGE_ROLE],
    text: string,
    metadata?: Record<string, unknown>
): AgentMessage {
    return { id, role, content: text, createdAt: 0, ...(metadata !== undefined ? { metadata } : {}) }
}

function makeToolCallMessage(id: string, args: string, metadata?: Record<string, unknown>): AgentMessage {
    return {
        id,
        role: MESSAGE_ROLE.ASSISTANT,
        content: [
            {
                type: CONTENT_TYPE.TOOL_CALL,
                toolCall: {
                    id: `call-${id}`,
                    function: { name: 'my_tool', arguments: args }
                }
            }
        ],
        createdAt: 0,
        ...(metadata !== undefined ? { metadata } : {})
    }
}

function makeToolResultMessage(id: string, content: string, metadata?: Record<string, unknown>): AgentMessage {
    return {
        id,
        role: MESSAGE_ROLE.TOOL_RESULT,
        content: [
            {
                type: CONTENT_TYPE.TOOL_RESULT,
                toolResult: { id: `call-${id}`, content }
            }
        ],
        createdAt: 0,
        ...(metadata !== undefined ? { metadata } : {})
    }
}

const BIG = 'x'.repeat(600)
const HUGE = 'x'.repeat(1100)
const CONTEXT_WINDOW = 100

describe('ToolCallCompressor', () => {
    describe('constructor', () => {
        it('applies default options when constructed with no arguments', async () => {
            const compressor = new ToolCallCompressor()
            const msg = makeToolCallMessage('1', BIG)
            const result = await compressor.optimize([msg], makeUsage(999), CONTEXT_WINDOW)
            expect(result).toEqual([msg])
        })
    })

    describe('optimize() — threshold check', () => {
        it('returns messages unchanged when usage is below threshold', async () => {
            const compressor = new ToolCallCompressor({ threshold: 0.5 })
            const messages = [makeTextMessage('1', MESSAGE_ROLE.USER, 'hello')]
            const result = await compressor.optimize(messages, makeUsage(40), CONTEXT_WINDOW)
            expect(result).toBe(messages)
        })

        it('runs compression when usage meets or exceeds threshold', async () => {
            const compressor = new ToolCallCompressor({ threshold: 0.5, preserveRecentCount: 0 })
            const past = makeToolCallMessage('1', BIG)
            const messages = [past]
            const result = await compressor.optimize(messages, makeUsage(60), CONTEXT_WINDOW)
            expect(result).not.toBe(messages)
        })
    })

    describe('runOptimize()', () => {
        let compressor: ToolCallCompressor

        beforeEach(() => {
            compressor = new ToolCallCompressor({ threshold: 0, preserveRecentCount: 0 })
        })

        it('always preserves system messages', async () => {
            const sys = makeTextMessage('sys', MESSAGE_ROLE.SYSTEM, 'system prompt')
            const messages = [sys]
            const result = await compressor.optimize(messages, makeUsage(999), CONTEXT_WINDOW)
            expect(result).toContainEqual(expect.objectContaining({ id: 'sys' }))
        })

        it('always preserves currentSession messages', async () => {
            const current = makeTextMessage('cs', MESSAGE_ROLE.USER, 'current', { currentSession: true })
            const messages = [current]
            const result = await compressor.optimize(messages, makeUsage(999), CONTEXT_WINDOW)
            expect(result).toContainEqual(expect.objectContaining({ id: 'cs' }))
        })

        it('places system messages before past messages before currentSession messages', async () => {
            const sys = makeTextMessage('sys', MESSAGE_ROLE.SYSTEM, 'sys')
            const past = makeTextMessage('past', MESSAGE_ROLE.USER, 'old')
            const current = makeTextMessage('cur', MESSAGE_ROLE.USER, 'cur', { currentSession: true })
            const messages = [sys, past, current]
            const result = await compressor.optimize(messages, makeUsage(999), CONTEXT_WINDOW)
            const ids = result.map(m => m.id)
            expect(ids.indexOf('sys')).toBeLessThan(ids.indexOf('past'))
            expect(ids.indexOf('past')).toBeLessThan(ids.indexOf('cur'))
        })

        it('truncates tool_call arguments that exceed argumentsSizeThreshold', async () => {
            const msg = makeToolCallMessage('1', BIG)
            const result = await compressor.optimize([msg], makeUsage(999), CONTEXT_WINDOW)
            const part = (
                result[0]?.content as Array<{ type: string; toolCall?: { function?: { arguments?: string } } }>
            )[0]
            expect(part?.toolCall?.function?.arguments).toBe('[truncated]')
        })

        it('leaves tool_call arguments within argumentsSizeThreshold unchanged', async () => {
            const msg = makeToolCallMessage('1', 'small args')
            const result = await compressor.optimize([msg], makeUsage(999), CONTEXT_WINDOW)
            const part = (
                result[0]?.content as Array<{ type: string; toolCall?: { function?: { arguments?: string } } }>
            )[0]
            expect(part?.toolCall?.function?.arguments).toBe('small args')
        })

        it('truncates tool_result content that exceeds resultSizeThreshold', async () => {
            const msg = makeToolResultMessage('1', HUGE)
            const result = await compressor.optimize([msg], makeUsage(999), CONTEXT_WINDOW)
            const part = (result[0]?.content as Array<{ type: string; toolResult?: { content?: string } }>)[0]
            expect(part?.toolResult?.content).toMatch(/\[result truncated/)
        })

        it('leaves tool_result content within resultSizeThreshold unchanged', async () => {
            const msg = makeToolResultMessage('1', 'small result')
            const result = await compressor.optimize([msg], makeUsage(999), CONTEXT_WINDOW)
            const part = (result[0]?.content as Array<{ type: string; toolResult?: { content?: string } }>)[0]
            expect(part?.toolResult?.content).toBe('small result')
        })

        it('returns messages unchanged when pastMessages.length <= preserveRecentCount', async () => {
            const compressorWithRecent = new ToolCallCompressor({ threshold: 0, preserveRecentCount: 10 })
            const past = makeToolCallMessage('1', BIG)
            const messages = [past]
            const result = await compressorWithRecent.optimize(messages, makeUsage(999), CONTEXT_WINDOW)
            expect(result).toBe(messages)
        })

        it('preserves the last preserveRecentCount past messages without compression', async () => {
            const compressorWithRecent = new ToolCallCompressor({
                threshold: 0,
                preserveRecentCount: 1,
                argumentsSizeThreshold: 100
            })
            const old = makeToolCallMessage('old', BIG)
            const recent = makeToolCallMessage('recent', BIG)
            const messages = [old, recent]
            const result = await compressorWithRecent.optimize(messages, makeUsage(999), CONTEXT_WINDOW)
            const recentResult = result.find(m => m.id === 'recent')
            const oldResult = result.find(m => m.id === 'old')
            const recentPart = (
                recentResult?.content as
                    Array<{ type: string; toolCall?: { function?: { arguments?: string } } }> | undefined
            )?.[0]
            const oldPart = (
                oldResult?.content as
                    Array<{ type: string; toolCall?: { function?: { arguments?: string } } }> | undefined
            )?.[0]
            expect(recentPart?.toolCall?.function?.arguments).toBe(BIG)
            expect(oldPart?.toolCall?.function?.arguments).toBe('[truncated]')
        })

        it('leaves content parts that are neither tool_call nor tool_result unchanged', async () => {
            const msg: AgentMessage = {
                id: '1',
                role: MESSAGE_ROLE.ASSISTANT,
                content: [{ type: CONTENT_TYPE.TEXT, text: 'hello' }],
                createdAt: 0
            }
            const result = await compressor.optimize([msg], makeUsage(999), CONTEXT_WINDOW)
            expect(result[0]?.content).toEqual([{ type: CONTENT_TYPE.TEXT, text: 'hello' }])
        })

        it('leaves plain string content messages unchanged', async () => {
            const msg = makeTextMessage('t', MESSAGE_ROLE.USER, 'just text')
            const result = await compressor.optimize([msg], makeUsage(999), CONTEXT_WINDOW)
            expect(result[0]?.content).toBe('just text')
        })
    })
})
