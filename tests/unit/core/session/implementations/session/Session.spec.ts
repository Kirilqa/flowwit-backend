import { Session } from '@session/implementations/session/Session'
import { SESSION_STATUS } from '@session'
import { AgentMessage } from '@agent/types/AgentMessage'
import { SessionOptimizerInterface } from '@session/optimizers'
import { CONTENT_TYPE, MESSAGE_ROLE } from '@provider'

function textMessage(id: string, text: string): AgentMessage {
    return { id, role: MESSAGE_ROLE.USER, content: text, createdAt: 0 }
}

function toolCallMessage(id: string, toolCallId: string): AgentMessage {
    return {
        id,
        role: MESSAGE_ROLE.ASSISTANT,
        content: [
            {
                type: CONTENT_TYPE.TOOL_CALL,
                toolCall: { id: toolCallId, function: { name: 'test_tool', arguments: '{}' } }
            }
        ],
        createdAt: 0
    }
}

function toolResultMessage(id: string, toolCallId: string): AgentMessage {
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

describe('Session', () => {
    describe('constructor defaults', () => {
        it('starts in IDLE status', () => {
            const session = new Session('s1')
            expect(session.status).toBe(SESSION_STATUS.IDLE)
        })

        it('starts with no title', () => {
            const session = new Session('s1')
            expect(session.title).toBeUndefined()
        })

        it('starts with zero usage', () => {
            const session = new Session('s1')
            expect(session.usage.totalTokens).toBe(0)
            expect(session.usage.promptTokens).toBe(0)
            expect(session.usage.completionTokens).toBe(0)
        })

        it('starts with empty messages', () => {
            const session = new Session('s1')
            expect(session.getMessages()).toHaveLength(0)
        })

        it('stores provided id', () => {
            const session = new Session('my-session-id')
            expect(session.id).toBe('my-session-id')
        })

        it('defaults to not temporary', () => {
            const session = new Session('s1')
            expect(session.temporary).toBe(false)
        })

        it('honors temporary: true in options', () => {
            const session = new Session('s1', [], { temporary: true })
            expect(session.temporary).toBe(true)
        })
    })

    describe('addMessage()', () => {
        it('appends message to the list', () => {
            const session = new Session('s1')
            session.addMessage(textMessage('m1', 'hello'))
            expect(session.getMessages()).toHaveLength(1)
        })

        it('marks message with currentSession in metadata', () => {
            const session = new Session('s1')
            session.addMessage(textMessage('m1', 'hello'))
            expect(session.getMessages()[0]?.metadata?.['currentSession']).toBe(true)
        })

        it('preserves existing metadata alongside currentSession', () => {
            const session = new Session('s1')
            const msg: AgentMessage = {
                id: 'm1',
                role: MESSAGE_ROLE.USER,
                content: 'hi',
                createdAt: 0,
                metadata: { tag: 'test' }
            }
            session.addMessage(msg)
            const stored = session.getMessages()[0]
            expect(stored?.metadata?.['tag']).toBe('test')
            expect(stored?.metadata?.['currentSession']).toBe(true)
        })

        it('updates updatedAt timestamp', () => {
            const session = new Session('s1')
            const before = session.updatedAt
            session.addMessage(textMessage('m1', 'hello'))
            expect(session.updatedAt).toBeGreaterThanOrEqual(before)
        })
    })

    describe('getMessages()', () => {
        it('returns a copy of the messages array', () => {
            const session = new Session('s1')
            session.addMessage(textMessage('m1', 'hello'))
            const first = session.getMessages()
            const second = session.getMessages()
            expect(first).not.toBe(second)
            expect(first).toEqual(second)
        })

        it('mutating the returned array does not affect session state', () => {
            const session = new Session('s1')
            session.addMessage(textMessage('m1', 'hello'))
            const msgs = session.getMessages()
            msgs.pop()
            expect(session.getMessages()).toHaveLength(1)
        })
    })

    describe('setMessages()', () => {
        it('replaces all messages', () => {
            const session = new Session('s1')
            session.addMessage(textMessage('m1', 'old'))
            session.setMessages([textMessage('m2', 'new')])
            const messages = session.getMessages()
            expect(messages).toHaveLength(1)
            expect(messages[0]?.id).toBe('m2')
        })
    })

    describe('setStatus()', () => {
        it('updates status', () => {
            const session = new Session('s1')
            session.setStatus(SESSION_STATUS.RUNNING)
            expect(session.status).toBe(SESSION_STATUS.RUNNING)
        })
    })

    describe('setTitle()', () => {
        it('updates title', () => {
            const session = new Session('s1')
            session.setTitle('My Session')
            expect(session.title).toBe('My Session')
        })
    })

    describe('setUsage()', () => {
        it('replaces the current usage', () => {
            const session = new Session('s1')
            session.setUsage({ promptTokens: 100, completionTokens: 50, totalTokens: 150 })
            expect(session.usage.totalTokens).toBe(150)
            expect(session.usage.promptTokens).toBe(100)
        })
    })

    describe('workingDirectory', () => {
        it('is undefined by default', () => {
            const session = new Session('s1')
            expect(session.workingDirectory).toBeUndefined()
        })

        it('can be set', () => {
            const session = new Session('s1')
            session.setWorkingDirectory('/home/user/project')
            expect(session.workingDirectory).toBe('/home/user/project')
        })

        it('can be cleared', () => {
            const session = new Session('s1')
            session.setWorkingDirectory('/home/user/project')
            session.clearWorkingDirectory()
            expect(session.workingDirectory).toBeUndefined()
        })
    })

    describe('commitSession()', () => {
        it('removes currentSession flag from all message metadata', () => {
            const session = new Session('s1')
            session.addMessage(textMessage('m1', 'hello'))
            session.commitSession()
            expect(session.getMessages()[0]?.metadata?.['currentSession']).toBeUndefined()
        })

        it('removes metadata object entirely when currentSession was the only key', () => {
            const session = new Session('s1')
            session.addMessage(textMessage('m1', 'hello'))
            session.commitSession()
            expect(session.getMessages()[0]?.metadata).toBeUndefined()
        })

        it('preserves other metadata keys when removing currentSession', () => {
            const session = new Session('s1')
            const msg: AgentMessage = {
                id: 'm1',
                role: MESSAGE_ROLE.USER,
                content: 'hi',
                createdAt: 0,
                metadata: { extra: 'data' }
            }
            session.addMessage(msg)
            session.commitSession()
            const committed = session.getMessages()[0]
            expect(committed?.metadata?.['extra']).toBe('data')
            expect(committed?.metadata?.['currentSession']).toBeUndefined()
        })

        it('keeps messages that were set directly without currentSession', () => {
            const session = new Session('s1')
            session.setMessages([textMessage('m1', 'direct')])
            session.commitSession()
            expect(session.getMessages()).toHaveLength(1)
        })

        it('removes orphaned tool call messages without matching tool results', () => {
            const session = new Session('s1')
            session.setMessages([toolCallMessage('tc1', 'call-1')])
            session.commitSession()
            expect(session.getMessages()).toHaveLength(0)
        })

        it('keeps tool call messages when matching tool result exists', () => {
            const session = new Session('s1')
            session.setMessages([toolCallMessage('tc1', 'call-1'), toolResultMessage('tr1', 'call-1')])
            session.commitSession()
            expect(session.getMessages()).toHaveLength(2)
        })
    })

    describe('optimize()', () => {
        it('applies each optimizer to the messages in sequence', async () => {
            const dropAll: SessionOptimizerInterface = {
                optimize: async () => []
            }
            const session = new Session('s1', [dropAll])
            session.setMessages([textMessage('m1', 'hello'), textMessage('m2', 'world')])
            await session.optimize()
            expect(session.getMessages()).toHaveLength(0)
        })

        it('chains multiple optimizers in order', async () => {
            const addSuffix: SessionOptimizerInterface = {
                optimize: async messages => [...messages, textMessage('appended', 'appended')]
            }
            const session = new Session('s1', [addSuffix, addSuffix])
            session.setMessages([textMessage('m1', 'start')])
            await session.optimize()
            expect(session.getMessages()).toHaveLength(3)
        })

        it('does nothing when there are no optimizers', async () => {
            const session = new Session('s1')
            session.setMessages([textMessage('m1', 'hello')])
            await session.optimize()
            expect(session.getMessages()).toHaveLength(1)
        })
    })
})
