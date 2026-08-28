import { z } from 'zod'
import { BaseHttpTool } from './bases/BaseHttpTool'
import { HttpResponse } from './types'
import { httpRequestToolSchema } from './validators'

export class HttpRequestTool extends BaseHttpTool<typeof httpRequestToolSchema> {
    readonly name = 'http_request'
    readonly description = 'Sends an HTTP request and returns status, headers and body as a string'
    readonly schema = httpRequestToolSchema

    protected async run(args: z.infer<typeof httpRequestToolSchema>): Promise<HttpResponse> {
        this.validateHost(args.url)
        return this.sendRequest(args)
    }

    private async sendRequest(args: z.infer<typeof httpRequestToolSchema>): Promise<HttpResponse> {
        const controller = new AbortController()
        const timer = setTimeout(() => {
            controller.abort()
        }, this.timeoutMs)

        try {
            const response = await fetch(args.url, {
                method: args.method,
                headers: this.mergeHeaders(args.headers),
                body: args.body ?? null,
                signal: controller.signal
            })

            const body = await response.text()

            const headers: Record<string, string> = {}
            response.headers.forEach((value, key) => {
                headers[key] = value
            })

            return {
                status: response.status,
                statusText: response.statusText,
                headers,
                body
            }
        } finally {
            clearTimeout(timer)
        }
    }
}
