import { z } from 'zod'
import { HTTP_METHOD } from '../types'

export const httpRequestToolSchema = z.object({
    url: z.string().describe('Full URL to send the request to'),
    method: z
        .enum([HTTP_METHOD.GET, HTTP_METHOD.POST, HTTP_METHOD.PUT, HTTP_METHOD.PATCH, HTTP_METHOD.DELETE])
        .describe('HTTP method'),
    headers: z
        .record(z.string(), z.string())
        .optional()
        .describe('Request headers. Merged with default headers, these take priority on conflict'),
    body: z.string().optional().describe('Request body as a string. For JSON, serialize it before passing')
})
