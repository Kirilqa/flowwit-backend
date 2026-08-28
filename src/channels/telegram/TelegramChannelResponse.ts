import { Api, InlineKeyboard } from 'grammy'
import { AgentEvent } from '@agent'
import { AGENT_EVENT_TYPE } from '@agent/types'
import { SessionInterface, SessionManagerInterface } from '@session'
import { GUARDRAIL_REQUEST_DECISION } from '@guardrail'
import { ChannelResponseInterface } from '@channel'
import { flattenLeafSteps, PLAN_STEP_STATUS } from '@strategy'
import { formatPlanSummary, formatToolArgs } from './utils'

const DRAFT_THROTTLE_MS = 500
const DRAFT_ID = 1

export class TelegramChannelResponse implements ChannelResponseInterface {
    constructor(
        private readonly api: Api,
        private readonly chatId: number,
        private readonly session: SessionInterface,
        private readonly sessionManager: SessionManagerInterface
    ) {}

    async stream(events: AsyncIterable<AgentEvent>): Promise<void> {
        const toolMessageIds = new Map<string, number>()
        const stepDescriptions = new Map<string, string>()
        let accumulatedText = ''
        let lastDraftSent = 0
        let draftActive = false
        let progressMessageId: number | undefined = undefined
        let totalLeafCount = 0
        let startedLeafCount = 0

        try {
            for await (const event of events) {
                switch (event.type) {
                    case AGENT_EVENT_TYPE.TOOL_CALL_START: {
                        if (event.toolName === 'done') break
                        const msg = await this.api.sendMessage(this.chatId, `⚙️ Выполняю: \`${event.toolName}\``, {
                            parse_mode: 'Markdown'
                        })
                        toolMessageIds.set(event.toolCallId, msg.message_id)
                        break
                    }

                    case AGENT_EVENT_TYPE.TOOL_CALL: {
                        if (event.toolCall.name === 'done') break
                        const messageId = toolMessageIds.get(event.toolCall.id)
                        if (messageId !== undefined) {
                            const argsStr = formatToolArgs(event.toolCall.arguments)
                            const text = argsStr
                                ? `⚙️ Выполняю: \`${event.toolCall.name}\`\n${argsStr}`
                                : `⚙️ Выполняю: \`${event.toolCall.name}\``
                            try {
                                await this.api.editMessageText(this.chatId, messageId, text, {
                                    parse_mode: 'Markdown'
                                })
                            } catch {}
                        }
                        break
                    }

                    case AGENT_EVENT_TYPE.TOOL_RESULT: {
                        if (event.toolResult.name === 'done') break
                        const messageId = toolMessageIds.get(event.toolResult.id)
                        if (messageId !== undefined) {
                            const statusText = event.toolResult.isError
                                ? `❌ \`${event.toolResult.name}\`: ошибка`
                                : `✅ \`${event.toolResult.name}\`: выполнено`
                            try {
                                await this.api.editMessageText(this.chatId, messageId, statusText, {
                                    parse_mode: 'Markdown'
                                })
                            } catch {}
                        }
                        break
                    }

                    case AGENT_EVENT_TYPE.MESSAGE_DELTA: {
                        accumulatedText += event.delta
                        const now = Date.now()
                        if (!draftActive || now - lastDraftSent >= DRAFT_THROTTLE_MS) {
                            lastDraftSent = now
                            draftActive = true
                            await this.api.sendMessageDraft(this.chatId, DRAFT_ID, accumulatedText)
                        }
                        break
                    }

                    case AGENT_EVENT_TYPE.MESSAGE: {
                        await this.api.sendMessage(this.chatId, event.message, {
                            parse_mode: 'Markdown'
                        })
                        accumulatedText = ''
                        draftActive = false
                        lastDraftSent = 0
                        break
                    }

                    case AGENT_EVENT_TYPE.PLAN: {
                        await this.api.sendMessage(this.chatId, formatPlanSummary(event.plan))
                        const leaves = flattenLeafSteps(event.plan.steps)
                        totalLeafCount = leaves.length
                        startedLeafCount = leaves.filter(step => step.status === PLAN_STEP_STATUS.COMPLETED).length
                        progressMessageId = undefined
                        break
                    }

                    case AGENT_EVENT_TYPE.STEP_STARTED: {
                        stepDescriptions.set(event.stepId, event.description)
                        startedLeafCount++
                        const text = `▶️ Шаг ${startedLeafCount}/${totalLeafCount}: ${event.description}`

                        if (progressMessageId === undefined) {
                            const msg = await this.api.sendMessage(this.chatId, text)
                            progressMessageId = msg.message_id
                        } else {
                            try {
                                await this.api.editMessageText(this.chatId, progressMessageId, text)
                            } catch {}
                        }
                        break
                    }

                    case AGENT_EVENT_TYPE.STEP_COMPLETED: {
                        if (progressMessageId !== undefined) {
                            const description = stepDescriptions.get(event.stepId) ?? event.stepId
                            const text = `✅ Шаг ${startedLeafCount}/${totalLeafCount}: ${description}`
                            try {
                                await this.api.editMessageText(this.chatId, progressMessageId, text)
                            } catch {}
                        }
                        break
                    }

                    case AGENT_EVENT_TYPE.STEP_FAILED: {
                        if (progressMessageId !== undefined) {
                            const description = stepDescriptions.get(event.stepId) ?? event.stepId
                            const text = `⚠️ Шаг не пройден: ${description}\nПричина: ${event.error}\nПересматриваю план...`
                            try {
                                await this.api.editMessageText(this.chatId, progressMessageId, text)
                            } catch {}
                        }
                        break
                    }

                    case AGENT_EVENT_TYPE.GUARDRAIL_REQUEST: {
                        await this.sendGuardrailMessage(event.requestId, event.reason, event.context.type)
                        break
                    }

                    case AGENT_EVENT_TYPE.ERROR: {
                        await this.api.sendMessage(this.chatId, `❌ Ошибка: ${event.error}`)
                        break
                    }
                }
            }
        } catch {
        } finally {
            await this.sessionManager.save(this.session)
        }
    }

    async error(message: string): Promise<void> {
        await this.api.sendMessage(this.chatId, `❌ Ошибка: ${message}`)
    }

    private async sendGuardrailMessage(
        requestId: string,
        reason: string | undefined,
        contextType: string
    ): Promise<void> {
        const contextLabels: Record<string, string> = {
            input: 'входящее сообщение',
            output: 'ответ агента',
            tool_call: 'вызов инструмента'
        }

        const contextLabel = contextLabels[contextType] ?? contextType
        const lines = [`🛡️ Требуется подтверждение (${contextLabel})`]
        if (reason !== undefined) lines.push(`📋 Причина: ${reason}`)

        const keyboard = new InlineKeyboard()
            .text('✅ Разрешить', `guardrail:${requestId}:${GUARDRAIL_REQUEST_DECISION.APPROVE}`)
            .text('❌ Запретить', `guardrail:${requestId}:${GUARDRAIL_REQUEST_DECISION.DENY}`)
            .row()
            .text('✅ Всегда разрешать', `guardrail:${requestId}:${GUARDRAIL_REQUEST_DECISION.APPROVE_ALWAYS}`)
            .text('❌ Всегда запрещать', `guardrail:${requestId}:${GUARDRAIL_REQUEST_DECISION.DENY_ALWAYS}`)

        await this.api.sendMessage(this.chatId, lines.join('\n'), { reply_markup: keyboard })
    }
}
