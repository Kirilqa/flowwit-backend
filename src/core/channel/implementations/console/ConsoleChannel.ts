import * as readline from 'readline'
import { randomUUID } from 'crypto'
import { AgentRegistryInterface } from '@agent'
import { SessionInterface, SessionManagerInterface } from '@session'
import {
    ChannelInterface,
    ChannelMessageHandler,
    ChannelStopHandler,
    ChannelRequest,
    ChannelSettings,
    ChannelSettingSchema
} from '@channel'
import { ConsoleChannelResponse } from './ConsoleChannelResponse'
import { ConsoleChannelSettings } from './types'

const COLORS = {
    info: '\x1b[36m',
    separator: '\x1b[90m',
    prompt: '\x1b[96m',
    reset: '\x1b[0m'
} as const

const EXIT_COMMANDS = new Set(['exit', 'quit', 'q'])

export class ConsoleChannel implements ChannelInterface<ConsoleChannelSettings> {
    readonly id = 'console'

    private readonly rl: readline.Interface
    private messageHandler: ChannelMessageHandler | null = null
    private stopHandler: ChannelStopHandler | null = null

    constructor(
        private readonly sessionManager: SessionManagerInterface,
        private readonly agentRegistry: AgentRegistryInterface
    ) {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        })
    }

    readonly settingsSchema: Array<ChannelSettingSchema<ConsoleChannelSettings>> = []

    // eslint-disable-next-line @typescript-eslint/no-empty-function -- console channel has no configurable settings, the method only satisfies the interface contract
    configure(_settings: ChannelSettings): void {}

    onMessage(handler: ChannelMessageHandler): void {
        this.messageHandler = handler
    }

    onStop(handler: ChannelStopHandler): void {
        this.stopHandler = handler
    }

    async start(): Promise<void> {
        const agent = this.agentRegistry.list()[0]

        if (!agent) {
            console.error('❌ No agents found in agents.json')
            process.exit(1)
        }

        const session = await this.sessionManager.create(randomUUID())

        this.printWelcome(agent.config.name, session.id)

        for await (const input of this.readLines()) {
            const trimmed = input.trim()

            if (!trimmed) continue

            if (EXIT_COMMANDS.has(trimmed.toLowerCase())) {
                await this.shutdown(session.id)
                return
            }

            await this.handleInput(agent.config.id, session, trimmed)
        }
    }

    async stop(): Promise<void> {
        this.rl.close()
    }

    private async handleInput(agentId: string, session: SessionInterface, content: string): Promise<void> {
        this.separator()

        const channelRequest: ChannelRequest = { agentId, session, content }
        const channelResponse = new ConsoleChannelResponse()

        if (this.messageHandler) {
            await this.messageHandler(channelRequest, channelResponse)
        }

        await this.sessionManager.save(session)

        this.printPrompt()
    }

    private async *readLines(): AsyncIterable<string> {
        this.printPrompt()

        for await (const line of this.rl) {
            yield line
        }
    }

    private printWelcome(agentName: string, sessionId: string): void {
        this.separator()
        this.log('🤖 Agent', agentName, COLORS.info)
        this.log('🔑 Session', sessionId, COLORS.info)
        this.log('💡 Hint', 'Type "exit" or "quit" to stop', COLORS.separator)
        this.separator()
    }

    private printPrompt(): void {
        process.stdout.write(`${COLORS.prompt}You › ${COLORS.reset}`)
    }

    private async shutdown(sessionId: string): Promise<void> {
        this.log('👋 Bye', 'Stopping agent...', COLORS.info)

        if (this.stopHandler) {
            await this.stopHandler(sessionId)
        }

        this.rl.close()
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
