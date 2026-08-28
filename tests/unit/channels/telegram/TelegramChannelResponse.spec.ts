import { Api } from 'grammy'
import { TelegramChannelResponse } from '@/channels/telegram/TelegramChannelResponse'
import { AGENT_EVENT_TYPE, AgentEvent } from '@agent/types'
import { SessionInterface } from '@session'
import { PLAN_STEP_STATUS } from '@strategy'
import { GUARDRAIL_REQUEST_CONTEXT_TYPE } from '@guardrail'
import { makeSessionManager } from '../../../helpers/makeAgent'
import { toAsyncIterable } from '../../../helpers/toAsyncIterable'

function baseFields() {
    return { id: 'evt', agentId: 'agent-1', sessionId: 'session-1', createdAt: 0 }
}

function makeApi() {
    let nextMessageId = 1

    return {
        sendMessage: jest.fn().mockImplementation(() => Promise.resolve({ message_id: nextMessageId++ })),
        editMessageText: jest.fn().mockResolvedValue(undefined),
        sendMessageDraft: jest.fn().mockResolvedValue(undefined)
    }
}

function makeResponse(api: ReturnType<typeof makeApi>, chatId = 123) {
    return new TelegramChannelResponse(api as unknown as Api, chatId, {} as SessionInterface, makeSessionManager())
}

describe('TelegramChannelResponse', () => {
    it('sends a plan summary message on PLAN', async () => {
        const api = makeApi()
        const response = new TelegramChannelResponse(
            api as unknown as Api,
            123,
            {} as SessionInterface,
            makeSessionManager()
        )

        const plan = {
            steps: [
                { id: '1', description: 'Step one', status: PLAN_STEP_STATUS.PENDING },
                { id: '2', description: 'Step two', status: PLAN_STEP_STATUS.PENDING }
            ]
        }

        const events: Array<AgentEvent> = [{ ...baseFields(), type: AGENT_EVENT_TYPE.PLAN, plan }]

        await response.stream(toAsyncIterable(events))

        expect(api.sendMessage).toHaveBeenCalledWith(123, expect.stringContaining('План (2 шагов)'))
    })

    it('sends a new progress message on the first STEP_STARTED and edits it on STEP_COMPLETED', async () => {
        const api = makeApi()
        const response = new TelegramChannelResponse(
            api as unknown as Api,
            123,
            {} as SessionInterface,
            makeSessionManager()
        )

        const plan = { steps: [{ id: '1', description: 'Step one', status: PLAN_STEP_STATUS.PENDING }] }

        const events: Array<AgentEvent> = [
            { ...baseFields(), type: AGENT_EVENT_TYPE.PLAN, plan },
            { ...baseFields(), type: AGENT_EVENT_TYPE.STEP_STARTED, stepId: '1', description: 'Step one' },
            { ...baseFields(), type: AGENT_EVENT_TYPE.STEP_COMPLETED, stepId: '1', result: 'done' }
        ]

        await response.stream(toAsyncIterable(events))

        expect(api.sendMessage).toHaveBeenCalledWith(123, expect.stringContaining('▶️ Шаг 1/1: Step one'))
        expect(api.editMessageText).toHaveBeenCalledWith(
            123,
            expect.any(Number),
            expect.stringContaining('✅ Шаг 1/1: Step one')
        )
    })

    it('edits the progress message with the failure reason on STEP_FAILED', async () => {
        const api = makeApi()
        const response = new TelegramChannelResponse(
            api as unknown as Api,
            123,
            {} as SessionInterface,
            makeSessionManager()
        )

        const plan = { steps: [{ id: '1', description: 'Step one', status: PLAN_STEP_STATUS.PENDING }] }

        const events: Array<AgentEvent> = [
            { ...baseFields(), type: AGENT_EVENT_TYPE.PLAN, plan },
            { ...baseFields(), type: AGENT_EVENT_TYPE.STEP_STARTED, stepId: '1', description: 'Step one' },
            { ...baseFields(), type: AGENT_EVENT_TYPE.STEP_FAILED, stepId: '1', error: 'Something broke' }
        ]

        await response.stream(toAsyncIterable(events))

        expect(api.editMessageText).toHaveBeenCalledWith(
            123,
            expect.any(Number),
            expect.stringContaining('Something broke')
        )
    })

    it('recomputes leaf counts and preserves completed progress after a replan', async () => {
        const api = makeApi()
        const response = new TelegramChannelResponse(
            api as unknown as Api,
            123,
            {} as SessionInterface,
            makeSessionManager()
        )

        const initialPlan = {
            steps: [
                { id: '1', description: 'Step one', status: PLAN_STEP_STATUS.COMPLETED },
                { id: '2', description: 'Step two', status: PLAN_STEP_STATUS.PENDING }
            ]
        }
        const revisedPlan = {
            steps: [
                { id: '1', description: 'Step one', status: PLAN_STEP_STATUS.COMPLETED },
                { id: '2', description: 'Step two revised', status: PLAN_STEP_STATUS.PENDING },
                { id: '3', description: 'Step three', status: PLAN_STEP_STATUS.PENDING }
            ]
        }

        const events: Array<AgentEvent> = [
            { ...baseFields(), type: AGENT_EVENT_TYPE.PLAN, plan: initialPlan },
            { ...baseFields(), type: AGENT_EVENT_TYPE.PLAN, plan: revisedPlan },
            { ...baseFields(), type: AGENT_EVENT_TYPE.STEP_STARTED, stepId: '2', description: 'Step two revised' }
        ]

        await response.stream(toAsyncIterable(events))

        expect(api.sendMessage).toHaveBeenCalledWith(123, expect.stringContaining('Шаг 2/3: Step two revised'))
    })

    it('saves the session after streaming completes', async () => {
        const api = makeApi()
        const sessionManager = makeSessionManager()
        const session = {} as SessionInterface
        const response = new TelegramChannelResponse(api as unknown as Api, 123, session, sessionManager)

        await response.stream(toAsyncIterable([]))

        expect(sessionManager.save).toHaveBeenCalledWith(session)
    })

    it('swallows a thrown stream error and still saves the session', async () => {
        const api = makeApi()
        const sessionManager = makeSessionManager()
        const session = {} as SessionInterface
        const response = new TelegramChannelResponse(api as unknown as Api, 123, session, sessionManager)

        async function* throwingEvents(): AsyncIterable<AgentEvent> {
            throw new Error('stream broke')
        }

        await expect(response.stream(throwingEvents())).resolves.toBeUndefined()
        expect(sessionManager.save).toHaveBeenCalledWith(session)
    })

    describe('TOOL_CALL_START / TOOL_CALL / TOOL_RESULT', () => {
        it('sends a "running" message on TOOL_CALL_START and tracks it by toolCallId', async () => {
            const api = makeApi()
            const response = makeResponse(api)

            const events: Array<AgentEvent> = [
                { ...baseFields(), type: AGENT_EVENT_TYPE.TOOL_CALL_START, toolCallId: 'call-1', toolName: 'search' }
            ]
            await response.stream(toAsyncIterable(events))

            expect(api.sendMessage).toHaveBeenCalledWith(123, expect.stringContaining('search'), expect.anything())
        })

        it('does not send a message on TOOL_CALL_START for the "done" tool', async () => {
            const api = makeApi()
            const response = makeResponse(api)

            const events: Array<AgentEvent> = [
                { ...baseFields(), type: AGENT_EVENT_TYPE.TOOL_CALL_START, toolCallId: 'call-1', toolName: 'done' }
            ]
            await response.stream(toAsyncIterable(events))

            expect(api.sendMessage).not.toHaveBeenCalled()
        })

        it('edits the tracked message on TOOL_CALL with formatted arguments', async () => {
            const api = makeApi()
            const response = makeResponse(api)

            const events: Array<AgentEvent> = [
                { ...baseFields(), type: AGENT_EVENT_TYPE.TOOL_CALL_START, toolCallId: 'call-1', toolName: 'search' },
                {
                    ...baseFields(),
                    type: AGENT_EVENT_TYPE.TOOL_CALL,
                    toolCall: { id: 'call-1', name: 'search', arguments: { query: 'cats' } }
                }
            ]
            await response.stream(toAsyncIterable(events))

            expect(api.editMessageText).toHaveBeenCalledWith(
                123,
                expect.any(Number),
                expect.stringContaining('query: cats'),
                expect.anything()
            )
        })

        it('edits the tracked message on TOOL_CALL without an arguments line when there are none', async () => {
            const api = makeApi()
            const response = makeResponse(api)

            const events: Array<AgentEvent> = [
                { ...baseFields(), type: AGENT_EVENT_TYPE.TOOL_CALL_START, toolCallId: 'call-1', toolName: 'search' },
                {
                    ...baseFields(),
                    type: AGENT_EVENT_TYPE.TOOL_CALL,
                    toolCall: { id: 'call-1', name: 'search', arguments: {} }
                }
            ]
            await response.stream(toAsyncIterable(events))

            const [, , text] = api.editMessageText.mock.calls[0] as [number, number, string]
            expect(text).toBe('⚙️ Выполняю: `search`')
        })

        it('truncates formatted arguments longer than 100 characters', async () => {
            const api = makeApi()
            const response = makeResponse(api)

            const events: Array<AgentEvent> = [
                { ...baseFields(), type: AGENT_EVENT_TYPE.TOOL_CALL_START, toolCallId: 'call-1', toolName: 'search' },
                {
                    ...baseFields(),
                    type: AGENT_EVENT_TYPE.TOOL_CALL,
                    toolCall: { id: 'call-1', name: 'search', arguments: { query: 'x'.repeat(200) } }
                }
            ]
            await response.stream(toAsyncIterable(events))

            const [, , text] = api.editMessageText.mock.calls[0] as [number, number, string]
            const argsLine = text.split('\n')[1] ?? ''
            expect(argsLine.endsWith('...')).toBe(true)
            expect(argsLine.length).toBe(100)
        })

        it('serializes non-string argument values as JSON', async () => {
            const api = makeApi()
            const response = makeResponse(api)

            const events: Array<AgentEvent> = [
                { ...baseFields(), type: AGENT_EVENT_TYPE.TOOL_CALL_START, toolCallId: 'call-1', toolName: 'search' },
                {
                    ...baseFields(),
                    type: AGENT_EVENT_TYPE.TOOL_CALL,
                    toolCall: { id: 'call-1', name: 'search', arguments: { count: 5 } }
                }
            ]
            await response.stream(toAsyncIterable(events))

            const [, , text] = api.editMessageText.mock.calls[0] as [number, number, string]
            expect(text).toContain('count: 5')
        })

        it('does not edit any message on TOOL_CALL for the "done" tool', async () => {
            const api = makeApi()
            const response = makeResponse(api)

            const events: Array<AgentEvent> = [
                {
                    ...baseFields(),
                    type: AGENT_EVENT_TYPE.TOOL_CALL,
                    toolCall: { id: 'call-1', name: 'done', arguments: {} }
                }
            ]
            await response.stream(toAsyncIterable(events))

            expect(api.editMessageText).not.toHaveBeenCalled()
        })

        it('does not edit any message on TOOL_CALL when no TOOL_CALL_START was seen for that id', async () => {
            const api = makeApi()
            const response = makeResponse(api)

            const events: Array<AgentEvent> = [
                {
                    ...baseFields(),
                    type: AGENT_EVENT_TYPE.TOOL_CALL,
                    toolCall: { id: 'unknown-call', name: 'search', arguments: {} }
                }
            ]
            await response.stream(toAsyncIterable(events))

            expect(api.editMessageText).not.toHaveBeenCalled()
        })

        it('swallows an editMessageText failure on TOOL_CALL (e.g. message unchanged)', async () => {
            const api = makeApi()
            api.editMessageText.mockRejectedValueOnce(new Error('message is not modified'))
            const response = makeResponse(api)

            const events: Array<AgentEvent> = [
                { ...baseFields(), type: AGENT_EVENT_TYPE.TOOL_CALL_START, toolCallId: 'call-1', toolName: 'search' },
                {
                    ...baseFields(),
                    type: AGENT_EVENT_TYPE.TOOL_CALL,
                    toolCall: { id: 'call-1', name: 'search', arguments: {} }
                }
            ]

            await expect(response.stream(toAsyncIterable(events))).resolves.toBeUndefined()
        })

        it('edits the tracked message on TOOL_RESULT success', async () => {
            const api = makeApi()
            const response = makeResponse(api)

            const events: Array<AgentEvent> = [
                { ...baseFields(), type: AGENT_EVENT_TYPE.TOOL_CALL_START, toolCallId: 'call-1', toolName: 'search' },
                {
                    ...baseFields(),
                    type: AGENT_EVENT_TYPE.TOOL_RESULT,
                    toolResult: { id: 'call-1', name: 'search', output: 'ok', isError: false }
                }
            ]
            await response.stream(toAsyncIterable(events))

            expect(api.editMessageText).toHaveBeenCalledWith(
                123,
                expect.any(Number),
                expect.stringContaining('выполнено'),
                expect.anything()
            )
        })

        it('edits the tracked message on TOOL_RESULT failure', async () => {
            const api = makeApi()
            const response = makeResponse(api)

            const events: Array<AgentEvent> = [
                { ...baseFields(), type: AGENT_EVENT_TYPE.TOOL_CALL_START, toolCallId: 'call-1', toolName: 'search' },
                {
                    ...baseFields(),
                    type: AGENT_EVENT_TYPE.TOOL_RESULT,
                    toolResult: { id: 'call-1', name: 'search', output: 'boom', isError: true }
                }
            ]
            await response.stream(toAsyncIterable(events))

            expect(api.editMessageText).toHaveBeenCalledWith(
                123,
                expect.any(Number),
                expect.stringContaining('ошибка'),
                expect.anything()
            )
        })

        it('does not edit any message on TOOL_RESULT for the "done" tool', async () => {
            const api = makeApi()
            const response = makeResponse(api)

            const events: Array<AgentEvent> = [
                {
                    ...baseFields(),
                    type: AGENT_EVENT_TYPE.TOOL_RESULT,
                    toolResult: { id: 'call-1', name: 'done', output: 'done', isError: false }
                }
            ]
            await response.stream(toAsyncIterable(events))

            expect(api.editMessageText).not.toHaveBeenCalled()
        })

        it('does not edit any message on TOOL_RESULT when no TOOL_CALL_START was seen for that id', async () => {
            const api = makeApi()
            const response = makeResponse(api)

            const events: Array<AgentEvent> = [
                {
                    ...baseFields(),
                    type: AGENT_EVENT_TYPE.TOOL_RESULT,
                    toolResult: { id: 'unknown-call', name: 'search', output: 'ok', isError: false }
                }
            ]
            await response.stream(toAsyncIterable(events))

            expect(api.editMessageText).not.toHaveBeenCalled()
        })

        it('swallows an editMessageText failure on TOOL_RESULT (e.g. message unchanged)', async () => {
            const api = makeApi()
            api.editMessageText.mockRejectedValueOnce(new Error('message is not modified'))
            const response = makeResponse(api)

            const events: Array<AgentEvent> = [
                { ...baseFields(), type: AGENT_EVENT_TYPE.TOOL_CALL_START, toolCallId: 'call-1', toolName: 'search' },
                {
                    ...baseFields(),
                    type: AGENT_EVENT_TYPE.TOOL_RESULT,
                    toolResult: { id: 'call-1', name: 'search', output: 'ok', isError: false }
                }
            ]

            await expect(response.stream(toAsyncIterable(events))).resolves.toBeUndefined()
        })
    })

    describe('MESSAGE_DELTA / MESSAGE', () => {
        it('sends a draft immediately on the first MESSAGE_DELTA', async () => {
            const api = makeApi()
            const response = makeResponse(api)

            const events: Array<AgentEvent> = [{ ...baseFields(), type: AGENT_EVENT_TYPE.MESSAGE_DELTA, delta: 'Hel' }]
            await response.stream(toAsyncIterable(events))

            expect(api.sendMessageDraft).toHaveBeenCalledWith(123, 1, 'Hel')
        })

        it('throttles subsequent deltas within the throttle window', async () => {
            const api = makeApi()
            const response = makeResponse(api)
            const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1_000)

            try {
                const events: Array<AgentEvent> = [
                    { ...baseFields(), type: AGENT_EVENT_TYPE.MESSAGE_DELTA, delta: 'a' },
                    { ...baseFields(), type: AGENT_EVENT_TYPE.MESSAGE_DELTA, delta: 'b' }
                ]
                await response.stream(toAsyncIterable(events))

                expect(api.sendMessageDraft).toHaveBeenCalledTimes(1)
                expect(api.sendMessageDraft).toHaveBeenCalledWith(123, 1, 'a')
            } finally {
                nowSpy.mockRestore()
            }
        })

        it('sends another draft once the throttle window has passed', async () => {
            const api = makeApi()
            const response = makeResponse(api)
            const nowSpy = jest.spyOn(Date, 'now')

            try {
                nowSpy.mockReturnValueOnce(1_000).mockReturnValueOnce(2_000)
                const events: Array<AgentEvent> = [
                    { ...baseFields(), type: AGENT_EVENT_TYPE.MESSAGE_DELTA, delta: 'a' },
                    { ...baseFields(), type: AGENT_EVENT_TYPE.MESSAGE_DELTA, delta: 'b' }
                ]
                await response.stream(toAsyncIterable(events))

                expect(api.sendMessageDraft).toHaveBeenCalledTimes(2)
                expect(api.sendMessageDraft).toHaveBeenNthCalledWith(2, 123, 1, 'ab')
            } finally {
                nowSpy.mockRestore()
            }
        })

        it('sends the final message on MESSAGE and resets the draft state', async () => {
            const api = makeApi()
            const response = makeResponse(api)

            const events: Array<AgentEvent> = [
                { ...baseFields(), type: AGENT_EVENT_TYPE.MESSAGE_DELTA, delta: 'Hello' },
                { ...baseFields(), type: AGENT_EVENT_TYPE.MESSAGE, message: 'Hello world' }
            ]
            await response.stream(toAsyncIterable(events))

            expect(api.sendMessage).toHaveBeenCalledWith(123, 'Hello world', expect.anything())
        })

        it('sends a fresh draft immediately after a MESSAGE resets the throttle state', async () => {
            const api = makeApi()
            const response = makeResponse(api)
            const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1_000)

            try {
                const events: Array<AgentEvent> = [
                    { ...baseFields(), type: AGENT_EVENT_TYPE.MESSAGE_DELTA, delta: 'a' },
                    { ...baseFields(), type: AGENT_EVENT_TYPE.MESSAGE, message: 'a' },
                    { ...baseFields(), type: AGENT_EVENT_TYPE.MESSAGE_DELTA, delta: 'b' }
                ]
                await response.stream(toAsyncIterable(events))

                expect(api.sendMessageDraft).toHaveBeenCalledTimes(2)
            } finally {
                nowSpy.mockRestore()
            }
        })
    })

    describe('GUARDRAIL_REQUEST', () => {
        it('sends a message with an inline keyboard including the reason when present', async () => {
            const api = makeApi()
            const response = makeResponse(api)

            const events: Array<AgentEvent> = [
                {
                    ...baseFields(),
                    type: AGENT_EVENT_TYPE.GUARDRAIL_REQUEST,
                    requestId: 'req-1',
                    reason: 'looks risky',
                    context: { type: GUARDRAIL_REQUEST_CONTEXT_TYPE.TOOL_CALL, toolCallId: 'call-1' }
                }
            ]
            await response.stream(toAsyncIterable(events))

            expect(api.sendMessage).toHaveBeenCalledWith(
                123,
                expect.stringContaining('looks risky'),
                expect.objectContaining({ reply_markup: expect.anything() })
            )
        })

        it('omits the reason line when not present', async () => {
            const api = makeApi()
            const response = makeResponse(api)

            const events: Array<AgentEvent> = [
                {
                    ...baseFields(),
                    type: AGENT_EVENT_TYPE.GUARDRAIL_REQUEST,
                    requestId: 'req-1',
                    context: { type: GUARDRAIL_REQUEST_CONTEXT_TYPE.INPUT, input: 'hello' }
                }
            ]
            await response.stream(toAsyncIterable(events))

            const [, text] = api.sendMessage.mock.calls[0] as [number, string]
            expect(text).not.toContain('Причина')
        })

        it('labels an OUTPUT context request in Russian', async () => {
            const api = makeApi()
            const response = makeResponse(api)

            const events: Array<AgentEvent> = [
                {
                    ...baseFields(),
                    type: AGENT_EVENT_TYPE.GUARDRAIL_REQUEST,
                    requestId: 'req-1',
                    context: { type: GUARDRAIL_REQUEST_CONTEXT_TYPE.OUTPUT, output: 'reply' }
                }
            ]
            await response.stream(toAsyncIterable(events))

            expect(api.sendMessage).toHaveBeenCalledWith(
                123,
                expect.stringContaining('ответ агента'),
                expect.anything()
            )
        })
    })

    describe('ERROR event and error()', () => {
        it('sends an error message on an ERROR event', async () => {
            const api = makeApi()
            const response = makeResponse(api)

            const events: Array<AgentEvent> = [
                { ...baseFields(), type: AGENT_EVENT_TYPE.ERROR, error: 'boom', recoverable: false }
            ]
            await response.stream(toAsyncIterable(events))

            expect(api.sendMessage).toHaveBeenCalledWith(123, expect.stringContaining('boom'))
        })

        it('sends an error message via error()', async () => {
            const api = makeApi()
            const response = makeResponse(api)

            await response.error('standalone failure')

            expect(api.sendMessage).toHaveBeenCalledWith(123, expect.stringContaining('standalone failure'))
        })
    })

    describe('STEP_COMPLETED / STEP_FAILED for a step with no recorded description', () => {
        it('falls back to the stepId on STEP_COMPLETED when its description was never recorded', async () => {
            const api = makeApi()
            const response = makeResponse(api)

            const plan = { steps: [{ id: '1', description: 'Step one', status: PLAN_STEP_STATUS.PENDING }] }
            const events: Array<AgentEvent> = [
                { ...baseFields(), type: AGENT_EVENT_TYPE.PLAN, plan },
                { ...baseFields(), type: AGENT_EVENT_TYPE.STEP_STARTED, stepId: '1', description: 'Step one' },
                { ...baseFields(), type: AGENT_EVENT_TYPE.STEP_COMPLETED, stepId: 'unseen-step', result: 'done' }
            ]
            await response.stream(toAsyncIterable(events))

            expect(api.editMessageText).toHaveBeenCalledWith(
                123,
                expect.any(Number),
                expect.stringContaining('unseen-step')
            )
        })

        it('falls back to the stepId on STEP_FAILED when its description was never recorded', async () => {
            const api = makeApi()
            const response = makeResponse(api)

            const plan = { steps: [{ id: '1', description: 'Step one', status: PLAN_STEP_STATUS.PENDING }] }
            const events: Array<AgentEvent> = [
                { ...baseFields(), type: AGENT_EVENT_TYPE.PLAN, plan },
                { ...baseFields(), type: AGENT_EVENT_TYPE.STEP_STARTED, stepId: '1', description: 'Step one' },
                { ...baseFields(), type: AGENT_EVENT_TYPE.STEP_FAILED, stepId: 'unseen-step', error: 'boom' }
            ]
            await response.stream(toAsyncIterable(events))

            expect(api.editMessageText).toHaveBeenCalledWith(
                123,
                expect.any(Number),
                expect.stringContaining('unseen-step')
            )
        })
    })

    describe('STEP_COMPLETED / STEP_FAILED without an active progress message', () => {
        it('does nothing on STEP_COMPLETED when no progress message was started', async () => {
            const api = makeApi()
            const response = makeResponse(api)

            const events: Array<AgentEvent> = [
                { ...baseFields(), type: AGENT_EVENT_TYPE.STEP_COMPLETED, stepId: '1', result: 'done' }
            ]
            await response.stream(toAsyncIterable(events))

            expect(api.editMessageText).not.toHaveBeenCalled()
        })

        it('does nothing on STEP_FAILED when no progress message was started', async () => {
            const api = makeApi()
            const response = makeResponse(api)

            const events: Array<AgentEvent> = [
                { ...baseFields(), type: AGENT_EVENT_TYPE.STEP_FAILED, stepId: '1', error: 'boom' }
            ]
            await response.stream(toAsyncIterable(events))

            expect(api.editMessageText).not.toHaveBeenCalled()
        })

        it('swallows an editMessageText failure on STEP_STARTED (e.g. message unchanged)', async () => {
            const api = makeApi()
            api.editMessageText.mockRejectedValueOnce(new Error('message is not modified'))
            const response = makeResponse(api)

            const plan = { steps: [{ id: '1', description: 'Step one', status: PLAN_STEP_STATUS.PENDING }] }
            const events: Array<AgentEvent> = [
                { ...baseFields(), type: AGENT_EVENT_TYPE.PLAN, plan },
                { ...baseFields(), type: AGENT_EVENT_TYPE.STEP_STARTED, stepId: '1', description: 'Step one' },
                { ...baseFields(), type: AGENT_EVENT_TYPE.STEP_STARTED, stepId: '1', description: 'Step one again' }
            ]

            await expect(response.stream(toAsyncIterable(events))).resolves.toBeUndefined()
        })
    })
})
