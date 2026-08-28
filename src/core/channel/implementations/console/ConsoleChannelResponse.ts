import { AgentEvent, AGENT_EVENT_TYPE } from '@agent'
import { ChannelResponseInterface } from '@channel'
import { getErrorMessage } from '@core/utils'

const COLORS = {
    info: '\x1b[36m',
    error: '\x1b[31m',
    thinking: '\x1b[35m',
    tool: '\x1b[33m',
    message: '\x1b[37m',
    done: '\x1b[92m',
    separator: '\x1b[90m',
    reset: '\x1b[0m'
} as const

export class ConsoleChannelResponse implements ChannelResponseInterface {
    private isStreamingMessage = false
    private isStreamingToolCall = false

    async stream(events: AsyncIterable<AgentEvent>): Promise<void> {
        try {
            for await (const event of events) {
                this.renderEvent(event)
            }
        } catch (error) {
            this.endStream()
            this.log('❌ FATAL', getErrorMessage(error), COLORS.error)
        }
    }

    async error(message: string): Promise<void> {
        this.endStream()
        this.log('❌ ERROR', message, COLORS.error)
    }

    private renderEvent(event: AgentEvent): void {
        switch (event.type) {
            case AGENT_EVENT_TYPE.THINKING_DELTA:
                break

            case AGENT_EVENT_TYPE.THINKING:
                this.endStream()
                this.log(
                    '💭 THINKING',
                    event.thinking.length > 120 ? `${event.thinking.slice(0, 120)}...` : event.thinking,
                    COLORS.thinking
                )
                break

            case AGENT_EVENT_TYPE.MESSAGE_DELTA:
                if (!this.isStreamingMessage) {
                    this.endStream()
                    process.stdout.write(`${COLORS.message}${this.getTime()} 💬 MESSAGE `)
                    this.isStreamingMessage = true
                }
                process.stdout.write(event.delta)
                break

            case AGENT_EVENT_TYPE.MESSAGE:
                if (this.isStreamingMessage) {
                    this.endStream()
                } else {
                    this.log('💬 MESSAGE', event.message, COLORS.message)
                }
                break

            case AGENT_EVENT_TYPE.TOOL_CALL_START:
                this.endStream()
                process.stdout.write(
                    `${COLORS.tool}${this.getTime()} ⚙️  TOOL_CALL${COLORS.reset} [${event.toolName}] `
                )
                this.isStreamingToolCall = true
                break

            case AGENT_EVENT_TYPE.TOOL_CALL_DELTA:
                process.stdout.write(event.argumentsDelta)
                break

            case AGENT_EVENT_TYPE.TOOL_RESULT: {
                this.endStream()
                const { toolResult } = event
                const output =
                    typeof toolResult.output === 'string'
                        ? toolResult.output.slice(0, 100)
                        : JSON.stringify(toolResult.output).slice(0, 100)
                const status = toolResult.isError ? '❌' : '✅'
                this.log(`${status} TOOL_RESULT`, `[${toolResult.name}] → ${output}`, COLORS.tool)
                break
            }

            case AGENT_EVENT_TYPE.SKILL_CALL:
                this.endStream()
                this.log('📚 SKILL_CALL', `[${event.skillName}]`, COLORS.tool)
                break

            case AGENT_EVENT_TYPE.SKILL_RESULT:
                this.endStream()
                this.log(`${event.isError ? '❌' : '✅'} SKILL_RESULT`, `[${event.skillName}]`, COLORS.tool)
                break

            case AGENT_EVENT_TYPE.AGENT_CALL:
                this.endStream()
                this.log('🤝 AGENT_CALL', `[${event.targetAgentId}]`, COLORS.tool)
                break

            case AGENT_EVENT_TYPE.AGENT_RESULT:
                this.endStream()
                this.log(`${event.isError ? '❌' : '✅'} AGENT_RESULT`, `[${event.targetAgentId}]`, COLORS.tool)
                break

            case AGENT_EVENT_TYPE.DONE: {
                this.endStream()
                this.separator()
                const usageInfo = event.usage ? `tokens: ${event.usage.totalTokens}` : ''
                this.log('✅ DONE', usageInfo || '(completed)', COLORS.done)
                this.separator()
                break
            }

            case AGENT_EVENT_TYPE.ERROR:
                this.endStream()
                this.log('❌ ERROR', `${event.error} (recoverable=${event.recoverable})`, COLORS.error)
                break
        }
    }

    private endStream(): void {
        if (this.isStreamingMessage || this.isStreamingToolCall) {
            process.stdout.write(`${COLORS.reset}\n`)
            this.isStreamingMessage = false
            this.isStreamingToolCall = false
        }
    }

    private getTime(): string {
        return `[${new Date().toISOString().slice(11, 23)}]`
    }

    private log(label: string, message: string, color: string): void {
        console.log(`${color}${this.getTime()} ${label}${COLORS.reset} ${message}`)
    }

    private separator(): void {
        this.log('', '─'.repeat(60), COLORS.separator)
    }
}
