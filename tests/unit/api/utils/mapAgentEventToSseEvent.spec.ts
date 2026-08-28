import { mapAgentEventToSseEvent } from '@/api/utils/mapAgentEventToSseEvent'
import { SSE_EVENT_TYPE } from '@/api/types/SseEventType'
import { AGENT_EVENT_TYPE, AgentEvent } from '@agent/types'
import { PLAN_STEP_STATUS } from '@strategy'
import { GUARDRAIL_REQUEST_CONTEXT_TYPE } from '@guardrail'

function baseFields() {
    return { id: 'evt-1', agentId: 'agent-1', sessionId: 'session-1', createdAt: 0 }
}

describe('mapAgentEventToSseEvent', () => {
    it('maps a THINKING_DELTA event', () => {
        const event: AgentEvent = { ...baseFields(), type: AGENT_EVENT_TYPE.THINKING_DELTA, delta: 'chunk' }
        expect(mapAgentEventToSseEvent(event)).toEqual({
            event: SSE_EVENT_TYPE.THINKING_DELTA,
            data: { text: 'chunk' }
        })
    })

    it('maps a THINKING event', () => {
        const event: AgentEvent = { ...baseFields(), type: AGENT_EVENT_TYPE.THINKING, thinking: 'pondering' }
        expect(mapAgentEventToSseEvent(event)).toEqual({ event: SSE_EVENT_TYPE.THINKING, data: { text: 'pondering' } })
    })

    it('maps a TOOL_CALL_START event', () => {
        const event: AgentEvent = {
            ...baseFields(),
            type: AGENT_EVENT_TYPE.TOOL_CALL_START,
            toolCallId: 'call-1',
            toolName: 'search'
        }
        expect(mapAgentEventToSseEvent(event)).toEqual({
            event: SSE_EVENT_TYPE.TOOL_CALL_START,
            data: { id: 'call-1', name: 'search' }
        })
    })

    it('maps a TOOL_CALL_DELTA event', () => {
        const event: AgentEvent = {
            ...baseFields(),
            type: AGENT_EVENT_TYPE.TOOL_CALL_DELTA,
            toolCallId: 'call-1',
            argumentsDelta: '{"a":'
        }
        expect(mapAgentEventToSseEvent(event)).toEqual({
            event: SSE_EVENT_TYPE.TOOL_CALL_DELTA,
            data: { id: 'call-1', arguments: '{"a":' }
        })
    })

    it('maps a TOOL_CALL event', () => {
        const toolCall = { id: 'call-1', name: 'search', arguments: { query: 'x' } }
        const event: AgentEvent = { ...baseFields(), type: AGENT_EVENT_TYPE.TOOL_CALL, toolCall }
        expect(mapAgentEventToSseEvent(event)).toEqual({ event: SSE_EVENT_TYPE.TOOL_CALL, data: { toolCall } })
    })

    it('maps a TOOL_RESULT event', () => {
        const toolResult = { id: 'call-1', name: 'search', output: 'ok', isError: false }
        const event: AgentEvent = { ...baseFields(), type: AGENT_EVENT_TYPE.TOOL_RESULT, toolResult }
        expect(mapAgentEventToSseEvent(event)).toEqual({ event: SSE_EVENT_TYPE.TOOL_RESULT, data: { toolResult } })
    })

    it('maps a GUARDRAIL_REQUEST event, including the reason when present', () => {
        const context = { type: GUARDRAIL_REQUEST_CONTEXT_TYPE.INPUT, input: 'suspicious text' }
        const event: AgentEvent = {
            ...baseFields(),
            type: AGENT_EVENT_TYPE.GUARDRAIL_REQUEST,
            requestId: 'req-1',
            reason: 'flagged',
            context
        }
        expect(mapAgentEventToSseEvent(event)).toEqual({
            event: SSE_EVENT_TYPE.GUARDRAIL_REQUEST,
            data: { requestId: 'req-1', context, reason: 'flagged' }
        })
    })

    it('omits reason from a GUARDRAIL_REQUEST event when absent', () => {
        const context = { type: GUARDRAIL_REQUEST_CONTEXT_TYPE.OUTPUT, output: 'reply' }
        const event: AgentEvent = {
            ...baseFields(),
            type: AGENT_EVENT_TYPE.GUARDRAIL_REQUEST,
            requestId: 'req-1',
            context
        }
        const mapped = mapAgentEventToSseEvent(event)
        expect(mapped?.data).not.toHaveProperty('reason')
    })

    it('maps a MESSAGE_DELTA event', () => {
        const event: AgentEvent = { ...baseFields(), type: AGENT_EVENT_TYPE.MESSAGE_DELTA, delta: 'chunk' }
        expect(mapAgentEventToSseEvent(event)).toEqual({ event: SSE_EVENT_TYPE.CONTENT_DELTA, data: { text: 'chunk' } })
    })

    it('maps a MESSAGE event', () => {
        const event: AgentEvent = { ...baseFields(), type: AGENT_EVENT_TYPE.MESSAGE, message: 'hello' }
        expect(mapAgentEventToSseEvent(event)).toEqual({ event: SSE_EVENT_TYPE.CONTENT, data: { text: 'hello' } })
    })

    it('maps a HUMAN_INPUT event', () => {
        const request = { id: 'req-1', question: 'Continue?', createdAt: 0 }
        const event: AgentEvent = { ...baseFields(), type: AGENT_EVENT_TYPE.HUMAN_INPUT, request }
        expect(mapAgentEventToSseEvent(event)).toEqual({ event: SSE_EVENT_TYPE.HUMAN_INPUT, data: { request } })
    })

    it('maps an ITERATION event, including usage and budgetState when present', () => {
        const usage = { promptTokens: 10, completionTokens: 5, totalTokens: 15 }
        const budgetState = { usedTokens: 15, usedIterations: 1, usedToolCalls: 0, usedCostUsd: 0, elapsedMs: 100 }
        const event: AgentEvent = { ...baseFields(), type: AGENT_EVENT_TYPE.ITERATION, usage, budgetState }
        expect(mapAgentEventToSseEvent(event)).toEqual({
            event: SSE_EVENT_TYPE.ITERATION,
            data: { usage, budgetState }
        })
    })

    it('omits usage and budgetState from an ITERATION event when absent', () => {
        const event: AgentEvent = { ...baseFields(), type: AGENT_EVENT_TYPE.ITERATION }
        expect(mapAgentEventToSseEvent(event)).toEqual({ event: SSE_EVENT_TYPE.ITERATION, data: {} })
    })

    it('maps a PLAN event', () => {
        const plan = { steps: [{ id: '1', description: 'Do X', status: PLAN_STEP_STATUS.PENDING }] }
        const event: AgentEvent = { ...baseFields(), type: AGENT_EVENT_TYPE.PLAN, plan }

        expect(mapAgentEventToSseEvent(event)).toEqual({ event: SSE_EVENT_TYPE.PLAN, data: { plan } })
    })

    it('maps a STEP_STARTED event', () => {
        const event: AgentEvent = {
            ...baseFields(),
            type: AGENT_EVENT_TYPE.STEP_STARTED,
            stepId: '1',
            description: 'Do X'
        }

        expect(mapAgentEventToSseEvent(event)).toEqual({
            event: SSE_EVENT_TYPE.STEP_STARTED,
            data: { stepId: '1', description: 'Do X' }
        })
    })

    it('maps a STEP_COMPLETED event', () => {
        const event: AgentEvent = {
            ...baseFields(),
            type: AGENT_EVENT_TYPE.STEP_COMPLETED,
            stepId: '1',
            result: 'done'
        }

        expect(mapAgentEventToSseEvent(event)).toEqual({
            event: SSE_EVENT_TYPE.STEP_COMPLETED,
            data: { stepId: '1', result: 'done' }
        })
    })

    it('maps a STEP_FAILED event', () => {
        const event: AgentEvent = {
            ...baseFields(),
            type: AGENT_EVENT_TYPE.STEP_FAILED,
            stepId: '1',
            error: 'boom'
        }

        expect(mapAgentEventToSseEvent(event)).toEqual({
            event: SSE_EVENT_TYPE.STEP_FAILED,
            data: { stepId: '1', error: 'boom' }
        })
    })

    it('maps an ERROR event', () => {
        const event: AgentEvent = {
            ...baseFields(),
            type: AGENT_EVENT_TYPE.ERROR,
            error: 'something broke',
            recoverable: false
        }
        expect(mapAgentEventToSseEvent(event)).toEqual({
            event: SSE_EVENT_TYPE.ERROR,
            data: { message: 'something broke' }
        })
    })

    it('maps a STRUCTURED_OUTPUT_DELTA event', () => {
        const event: AgentEvent = { ...baseFields(), type: AGENT_EVENT_TYPE.STRUCTURED_OUTPUT_DELTA, delta: '{"a":' }
        expect(mapAgentEventToSseEvent(event)).toEqual({
            event: SSE_EVENT_TYPE.STRUCTURED_OUTPUT_DELTA,
            data: { text: '{"a":' }
        })
    })

    it('maps a STRUCTURED_OUTPUT event', () => {
        const event: AgentEvent = { ...baseFields(), type: AGENT_EVENT_TYPE.STRUCTURED_OUTPUT, output: { a: 1 } }
        expect(mapAgentEventToSseEvent(event)).toEqual({
            event: SSE_EVENT_TYPE.STRUCTURED_OUTPUT,
            data: { output: { a: 1 } }
        })
    })

    it('maps a DONE event', () => {
        const event: AgentEvent = { ...baseFields(), type: AGENT_EVENT_TYPE.DONE }
        expect(mapAgentEventToSseEvent(event)).toEqual({ event: SSE_EVENT_TYPE.DONE, data: {} })
    })

    it('returns null for event types without a mapping', () => {
        const event: AgentEvent = {
            ...baseFields(),
            type: AGENT_EVENT_TYPE.SKILL_CALL,
            skillName: 'test',
            arguments: {}
        }

        expect(mapAgentEventToSseEvent(event)).toBeNull()
    })
})
