import { z } from 'zod'
import { getErrorMessage } from '@core/utils'
import { WorkFlowNodeError } from '../../errors/WorkFlowNodeError'
import { WorkFlowNodeEvent } from '../../types/WorkFlowNodeEvent'
import { WorkFlowNodeResult } from '../../types/WorkFlowNodeResult'
import { BaseWorkFlowNode } from './bases/BaseWorkFlowNode'
import {
    httpRequestNodePortsSchema,
    httpRequestNodeOutputsSchema,
    httpRequestNodeConfigSchema,
    HTTP_BODY_FORMAT
} from './validators'

export class HttpRequestNode extends BaseWorkFlowNode<
    typeof httpRequestNodePortsSchema,
    typeof httpRequestNodeOutputsSchema,
    typeof httpRequestNodeConfigSchema
> {
    readonly type = 'http_request' as const
    readonly ports = httpRequestNodePortsSchema
    readonly outputs = httpRequestNodeOutputsSchema
    override readonly configSchema = httpRequestNodeConfigSchema

    protected async *run(
        _ports: z.infer<typeof httpRequestNodePortsSchema>,
        config: z.infer<typeof httpRequestNodeConfigSchema>
    ): AsyncGenerator<WorkFlowNodeEvent, WorkFlowNodeResult<z.infer<typeof httpRequestNodeOutputsSchema>>> {
        const abortController = new AbortController()
        const timeoutId = setTimeout(() => {
            abortController.abort()
        }, config.timeoutMs)

        let response: Response

        try {
            const body = this.buildBody(config)

            response = await fetch(config.url, {
                method: config.method,
                headers: this.buildHeaders(config),
                signal: abortController.signal,
                ...(body !== undefined && { body })
            })
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                throw new WorkFlowNodeError(`Request timed out after ${config.timeoutMs}ms in node "${this.type}"`)
            }

            throw new WorkFlowNodeError(`Request failed in node "${this.type}": ${getErrorMessage(error)}`)
        } finally {
            clearTimeout(timeoutId)
        }

        const responseHeaders = Object.fromEntries(response.headers.entries())
        const contentType = response.headers.get('content-type') ?? ''

        let result: unknown

        try {
            if (contentType.includes('application/json')) {
                result = await response.json()
            } else {
                result = await response.text()
            }
        } catch (error) {
            throw new WorkFlowNodeError(`Failed to parse response in node "${this.type}": ${getErrorMessage(error)}`)
        }

        return {
            output: {
                result,
                status: response.status,
                headers: responseHeaders
            }
        }
    }

    private buildHeaders(config: z.infer<typeof httpRequestNodeConfigSchema>): Record<string, string> {
        const headers = { ...config.headers }

        if (config.body === undefined) return headers

        if (config.bodyFormat === HTTP_BODY_FORMAT.JSON && !headers['content-type']) {
            headers['content-type'] = 'application/json'
        } else if (config.bodyFormat === HTTP_BODY_FORMAT.FORM && !headers['content-type']) {
            headers['content-type'] = 'application/x-www-form-urlencoded'
        }

        return headers
    }

    private buildBody(config: z.infer<typeof httpRequestNodeConfigSchema>): BodyInit | undefined {
        if (config.body === undefined) return undefined

        if (config.bodyFormat === HTTP_BODY_FORMAT.JSON) {
            return JSON.stringify(config.body)
        }

        if (config.bodyFormat === HTTP_BODY_FORMAT.FORM) {
            const params = new URLSearchParams()

            if (typeof config.body === 'object' && config.body !== null) {
                for (const [key, value] of Object.entries(config.body)) {
                    params.append(key, String(value))
                }
            }

            return params
        }

        return typeof config.body === 'string' ? config.body : JSON.stringify(config.body)
    }
}
