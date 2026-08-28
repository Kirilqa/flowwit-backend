import { ZodObject, ZodRawShape } from 'zod'
import { BaseTool } from '../../bases/BaseTool'
import { AgentToolError } from '../../../errors'
import { HttpToolOptions } from '../types'

const DEFAULT_TIMEOUT_MS = 30_000

export abstract class BaseHttpTool<TSchema extends ZodObject<ZodRawShape>> extends BaseTool<TSchema> {
    protected readonly allowedHosts?: Array<string>
    protected readonly blockedHosts?: Array<string>
    protected readonly timeoutMs: number
    protected readonly defaultHeaders?: Record<string, string>

    constructor(options?: HttpToolOptions) {
        super()

        if (options?.allowedHosts !== undefined) {
            this.allowedHosts = options.allowedHosts
        }

        if (options?.blockedHosts !== undefined) {
            this.blockedHosts = options.blockedHosts
        }

        if (options?.defaultHeaders !== undefined) {
            this.defaultHeaders = options.defaultHeaders
        }

        this.timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS
    }

    protected validateHost(url: string): void {
        const host = this.extractHost(url)

        if (this.allowedHosts !== undefined) {
            if (!this.allowedHosts.includes(host)) {
                throw new AgentToolError(
                    `Host "${host}" is not allowed. Allowed hosts: ${this.allowedHosts.join(', ')}`
                )
            }

            return
        }

        if (this.blockedHosts?.includes(host)) {
            throw new AgentToolError(`Host "${host}" is blocked`)
        }
    }

    protected mergeHeaders(requestHeaders?: Record<string, string>): Record<string, string> {
        return {
            ...this.defaultHeaders,
            ...requestHeaders
        }
    }

    private extractHost(url: string): string {
        return new URL(url).hostname
    }
}
