import { z } from 'zod'

const HTTP_METHOD = {
    GET: 'GET',
    POST: 'POST',
    PUT: 'PUT',
    PATCH: 'PATCH',
    DELETE: 'DELETE',
    HEAD: 'HEAD',
    OPTIONS: 'OPTIONS'
} as const

export const HTTP_BODY_FORMAT = {
    JSON: 'json',
    TEXT: 'text',
    FORM: 'form'
} as const

export const httpRequestNodePortsSchema = z.object({
    trigger: z.unknown()
})

export const httpRequestNodeOutputsSchema = z.object({
    result: z.unknown(),
    status: z.number(),
    headers: z.record(z.string(), z.string())
})

export const httpRequestNodeConfigSchema = z.object({
    url: z.url(),
    method: z.enum([
        HTTP_METHOD.GET,
        HTTP_METHOD.POST,
        HTTP_METHOD.PUT,
        HTTP_METHOD.PATCH,
        HTTP_METHOD.DELETE,
        HTTP_METHOD.HEAD,
        HTTP_METHOD.OPTIONS
    ]),
    bodyFormat: z
        .enum([HTTP_BODY_FORMAT.JSON, HTTP_BODY_FORMAT.TEXT, HTTP_BODY_FORMAT.FORM])
        .default(HTTP_BODY_FORMAT.JSON),
    headers: z.record(z.string(), z.string()).default({}),
    body: z.unknown().optional(),
    timeoutMs: z.number().int().min(0).default(30000)
})
