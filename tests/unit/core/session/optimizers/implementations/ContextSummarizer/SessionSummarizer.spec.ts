import { SessionSummarizer } from '@session/optimizers/implementations/ContextSummarizer/SessionSummarizer'
import { AgentMessage } from '@agent/types/AgentMessage'
import { Usage } from '@provider/types'
import { MESSAGE_ROLE, CONTENT_TYPE, FINISH_REASON } from '@provider'
import { TestProvider, TEST_MODEL, makeProvider, textResponse } from '../../../../../../helpers/TestProvider'

function pastMsg(id: string, content = 'message'): AgentMessage {
    return { id, role: MESSAGE_ROLE.USER, content, createdAt: 0 }
}

function currentMsg(id: string, content = 'current'): AgentMessage {
    return { id, role: MESSAGE_ROLE.ASSISTANT, content, createdAt: 0, metadata: { currentSession: true } }
}

function systemMsg(id: string): AgentMessage {
    return { id, role: MESSAGE_ROLE.SYSTEM, content: 'System prompt.', createdAt: 0 }
}

function usage(total: number): Usage {
    return { promptTokens: 0, completionTokens: 0, totalTokens: total }
}

function toolCallMsg(id: string, toolCallId: string): AgentMessage {
    return {
        id,
        role: MESSAGE_ROLE.ASSISTANT,
        content: [
            {
                type: CONTENT_TYPE.TOOL_CALL,
                toolCall: { id: toolCallId, function: { name: 'tool', arguments: '{}' } }
            }
        ],
        createdAt: 0
    }
}

function toolResultMsg(id: string, toolCallId: string): AgentMessage {
    return {
        id,
        role: MESSAGE_ROLE.TOOL_RESULT,
        content: [
            {
                type: CONTENT_TYPE.TOOL_RESULT,
                toolResult: { id: toolCallId, content: 'result' }
            }
        ],
        createdAt: 0
    }
}

describe('SessionSummarizer', () => {
    let provider: TestProvider
    let summarizer: SessionSummarizer

    beforeEach(() => {
        provider = makeProvider()
        summarizer = new SessionSummarizer({
            threshold: 0,
            preserveRecentCount: 3
        })
    })

    describe('constructor defaults', () => {
        it('uses default options when none are provided', async () => {
            const defaultSummarizer = new SessionSummarizer()
            const messages = [pastMsg('m1')]
            const result = await defaultSummarizer.optimize(messages, usage(100), 1000, provider, TEST_MODEL)
            expect(result).toBe(messages)
        })
    })

    describe('optimize() — missing provider/model', () => {
        it('returns messages unchanged when provider is not passed', async () => {
            const messages = [pastMsg('m1'), pastMsg('m2'), pastMsg('m3'), pastMsg('m4')]
            const result = await summarizer.optimize(messages, usage(500), 1000, undefined, TEST_MODEL)

            expect(result).toBe(messages)
            expect(provider.calls).toHaveLength(0)
        })

        it('returns messages unchanged when model is not passed', async () => {
            const messages = [pastMsg('m1'), pastMsg('m2'), pastMsg('m3'), pastMsg('m4')]
            const result = await summarizer.optimize(messages, usage(500), 1000, provider, undefined)

            expect(result).toBe(messages)
            expect(provider.calls).toHaveLength(0)
        })
    })

    describe('optimize() — threshold guard', () => {
        it('returns messages unchanged when usage ratio is below threshold', async () => {
            const highThreshold = new SessionSummarizer({ threshold: 0.9 })
            const messages = [pastMsg('m1'), pastMsg('m2')]
            const result = await highThreshold.optimize(messages, usage(100), 1000, provider, TEST_MODEL)

            expect(result).toBe(messages)
        })

        it('calls runOptimize when usage ratio meets threshold', async () => {
            const atThreshold = new SessionSummarizer({
                threshold: 0.5,
                preserveRecentCount: 0
            })
            provider.respondWith(textResponse('Summary'))
            const messages = [pastMsg('m1'), pastMsg('m2')]
            const result = await atThreshold.optimize(messages, usage(500), 1000, provider, TEST_MODEL)

            expect(result).not.toBe(messages)
        })
    })

    describe('runOptimize() — not enough past messages', () => {
        it('returns messages unchanged when past messages ≤ preserveRecentCount', async () => {
            const messages = [pastMsg('m1'), pastMsg('m2'), pastMsg('m3')]
            const result = await summarizer.runOptimize(messages, provider, TEST_MODEL)

            expect(result).toBe(messages)
        })

        it('returns messages unchanged when there are no past messages at all', async () => {
            const messages = [systemMsg('sys'), currentMsg('cur')]
            const result = await summarizer.runOptimize(messages, provider, TEST_MODEL)

            expect(result).toBe(messages)
        })
    })

    describe('runOptimize() — summarization', () => {
        it('calls provider.generate() with messages to summarize', async () => {
            provider.respondWith(textResponse('Summary text'))
            const messages = [pastMsg('m1'), pastMsg('m2'), pastMsg('m3'), pastMsg('m4')]

            await summarizer.runOptimize(messages, provider, TEST_MODEL)

            expect(provider.calls).toHaveLength(1)
        })

        it('the generate call includes only the messages to summarize, not preserved ones', async () => {
            provider.respondWith(textResponse('Summary text'))
            const messages = [pastMsg('m1'), pastMsg('m2'), pastMsg('m3'), pastMsg('m4')]

            await summarizer.runOptimize(messages, provider, TEST_MODEL)

            const spec = provider.calls[0]
            if (!spec) throw new Error('expected a generate call')
            const nonSystemMessages = spec.messages.filter(m => m.role !== MESSAGE_ROLE.SYSTEM)
            expect(nonSystemMessages).toHaveLength(1)
        })

        it('returns [systemMessages, summary, ...preserved, ...currentSession]', async () => {
            provider.respondWith(textResponse('The summary'))
            const messages = [
                systemMsg('sys'),
                pastMsg('m1'),
                pastMsg('m2'),
                pastMsg('m3'),
                pastMsg('m4'),
                currentMsg('cur')
            ]

            const result = await summarizer.runOptimize(messages, provider, TEST_MODEL)

            expect(result[0]?.role).toBe(MESSAGE_ROLE.SYSTEM)
            expect(result[result.length - 1]?.metadata?.['currentSession']).toBe(true)
        })

        it('summary message contains the provider response text', async () => {
            provider.respondWith(textResponse('Important context'))
            const messages = [pastMsg('m1'), pastMsg('m2'), pastMsg('m3'), pastMsg('m4')]

            const result = await summarizer.runOptimize(messages, provider, TEST_MODEL)

            const summaryMsg = result.find(
                m => typeof m.content === 'string' && m.content.includes('Important context')
            )
            expect(summaryMsg).toBeDefined()
        })

        it('preserves the last preserveRecentCount past messages verbatim', async () => {
            provider.respondWith(textResponse('Summary'))
            const messages = [pastMsg('m1'), pastMsg('m2'), pastMsg('m3'), pastMsg('m4')]

            const result = await summarizer.runOptimize(messages, provider, TEST_MODEL)

            const ids = result.map(m => m.id)
            expect(ids).toContain('m2')
            expect(ids).toContain('m3')
            expect(ids).toContain('m4')
            expect(ids).not.toContain('m1')
        })

        it('uses fallback text when provider returns empty choices', async () => {
            jest.spyOn(provider, 'generate').mockResolvedValue({
                data: {
                    id: 'g1',
                    model: TEST_MODEL,
                    choices: [],
                    usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
                },
                meta: { provider: 'test', latencyMs: 0 }
            })
            const messages = [pastMsg('m1'), pastMsg('m2'), pastMsg('m3'), pastMsg('m4')]

            const result = await summarizer.runOptimize(messages, provider, TEST_MODEL)

            const summaryMsg = result.find(
                m => typeof m.content === 'string' && m.content.includes('[Summary unavailable]')
            )
            expect(summaryMsg).toBeDefined()
        })

        it('extracts summary text when provider returns array content parts', async () => {
            jest.spyOn(provider, 'generate').mockResolvedValue({
                data: {
                    id: 'g1',
                    model: TEST_MODEL,
                    choices: [
                        {
                            index: 0,
                            message: {
                                role: MESSAGE_ROLE.ASSISTANT,
                                content: [{ type: CONTENT_TYPE.TEXT, text: 'Array-based summary' }]
                            },
                            finishReason: FINISH_REASON.STOP
                        }
                    ],
                    usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
                },
                meta: { provider: 'test', latencyMs: 0 }
            })
            const messages = [pastMsg('m1'), pastMsg('m2'), pastMsg('m3'), pastMsg('m4')]

            const result = await summarizer.runOptimize(messages, provider, TEST_MODEL)

            const summaryMsg = result.find(
                m => typeof m.content === 'string' && m.content.includes('Array-based summary')
            )
            expect(summaryMsg).toBeDefined()
        })
    })

    describe('findSafeSplitIndex — orphaned tool call avoidance', () => {
        it('adjusts split index to avoid cutting a tool call from its result', async () => {
            provider.respondWith(textResponse('Summary'))

            const messages = [
                pastMsg('m1'),
                toolCallMsg('m2', 'call-1'),
                toolResultMsg('m3', 'call-1'),
                pastMsg('m4'),
                pastMsg('m5')
            ]

            const result = await summarizer.runOptimize(messages, provider, TEST_MODEL)

            const resultIds = result.map(m => m.id)
            const m2Index = resultIds.indexOf('m2')
            const m3Index = resultIds.indexOf('m3')

            if (m2Index !== -1) {
                expect(m3Index).not.toBe(-1)
            }
        })

        it('returns original messages when all toSummarize messages are orphaned tool calls', async () => {
            const messages = [toolCallMsg('m1', 'call-x'), toolResultMsg('m2', 'call-x'), pastMsg('m3'), pastMsg('m4')]

            const result = await summarizer.runOptimize(messages, provider, TEST_MODEL)

            expect(result).toBe(messages)
        })

        it('stops adjusting when a tool call has no orphaned result in preserved', async () => {
            provider.respondWith(textResponse('Summary'))
            const messages = [
                toolCallMsg('m1', 'c1'),
                toolCallMsg('m2', 'c2'),
                toolResultMsg('m3', 'c2'),
                pastMsg('m4'),
                pastMsg('m5')
            ]

            const result = await summarizer.runOptimize(messages, provider, TEST_MODEL)

            const ids = result.map(m => m.id)
            expect(ids).toContain('m2')
            expect(ids).toContain('m3')
            expect(ids).not.toContain('m1')
        })
    })

    describe('extractToolResultIds — ignores non tool_result parts', () => {
        it('does not treat a preserved tool_call message as an orphaned tool result', async () => {
            provider.respondWith(textResponse('Summary'))
            const messages = [pastMsg('m1'), pastMsg('m2'), toolCallMsg('m3', 'x'), pastMsg('m4'), pastMsg('m5')]

            const result = await summarizer.runOptimize(messages, provider, TEST_MODEL)

            const ids = result.map(m => m.id)
            expect(ids).toContain('m3')
            expect(ids).toContain('m4')
            expect(ids).toContain('m5')
            expect(ids).not.toContain('m1')
        })
    })

    describe('system messages', () => {
        it('passes system messages through to the result unchanged', async () => {
            provider.respondWith(textResponse('Summary'))
            const messages = [systemMsg('sys'), pastMsg('m1'), pastMsg('m2'), pastMsg('m3'), pastMsg('m4')]

            const result = await summarizer.runOptimize(messages, provider, TEST_MODEL)

            expect(result.some(m => m.id === 'sys')).toBe(true)
        })

        it('places system messages first in the result', async () => {
            provider.respondWith(textResponse('Summary'))
            const messages = [systemMsg('sys'), pastMsg('m1'), pastMsg('m2'), pastMsg('m3'), pastMsg('m4')]

            const result = await summarizer.runOptimize(messages, provider, TEST_MODEL)

            expect(result[0]?.id).toBe('sys')
        })
    })
})
