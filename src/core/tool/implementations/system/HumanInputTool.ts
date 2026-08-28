import { z } from 'zod'
import { AgentTimeoutError } from '@agent/errors'
import { BaseTool } from '../bases/BaseTool'
import { HumanInputResolverInterface } from './interfaces'
import { humanInputToolSchema } from './validators'

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000

export class HumanInputTool extends BaseTool<typeof humanInputToolSchema> implements HumanInputResolverInterface {
    readonly name = 'human_input'
    readonly description =
        'Use this tool when you need clarification or additional information from the user to complete the task. The agent will pause and wait for the user to respond.'
    readonly schema = humanInputToolSchema

    private readonly pending = new Map<string, (answer: string) => void>()

    protected async run(
        args: z.infer<typeof humanInputToolSchema>,
        _agentId: string,
        sessionId: string
    ): Promise<string> {
        const timeoutMs = args.timeoutMs ?? DEFAULT_TIMEOUT_MS
        return this.waitForResponse(sessionId, timeoutMs)
    }

    respond(sessionId: string, answer: string): void {
        const resolve = this.pending.get(sessionId)

        if (!resolve) return

        resolve(answer)
        this.pending.delete(sessionId)
    }

    isWaiting(sessionId: string): boolean {
        return this.pending.has(sessionId)
    }

    private waitForResponse(sessionId: string, timeoutMs: number): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pending.delete(sessionId)
                reject(
                    new AgentTimeoutError(`HumanInputTool timed out after ${timeoutMs}ms for session "${sessionId}"`)
                )
            }, timeoutMs)

            this.pending.set(sessionId, answer => {
                clearTimeout(timer)
                resolve(answer)
            })
        })
    }
}
