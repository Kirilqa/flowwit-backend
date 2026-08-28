import { HttpRequestTool } from '@tool/implementations/http/HttpRequestTool'
import { AgentToolError } from '@tool/errors'

function makeResponse(status = 200, body = 'ok', contentType = 'text/plain'): Response {
    return {
        status,
        statusText: 'OK',
        headers: {
            get: (name: string) => (name === 'content-type' ? contentType : null),
            forEach: (cb: (value: string, key: string) => void) => {
                cb(contentType, 'content-type')
            }
        },
        text: () => Promise.resolve(body),
        json: () => Promise.resolve(JSON.parse(body))
    } as unknown as Response
}

describe('HttpRequestTool', () => {
    let fetchMock: jest.SpyInstance

    beforeEach(() => {
        fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(makeResponse())
    })

    afterEach(() => {
        fetchMock.mockRestore()
    })

    describe('name and description', () => {
        it('has name "http_request"', () => {
            expect(new HttpRequestTool().name).toBe('http_request')
        })

        it('has a description', () => {
            expect(new HttpRequestTool().description.length).toBeGreaterThan(0)
        })
    })

    describe('execute() argument validation', () => {
        it('throws AgentToolError when url is missing', async () => {
            const tool = new HttpRequestTool()
            await expect(tool.execute({ method: 'GET' }, 'agent', 'session')).rejects.toThrow(AgentToolError)
        })

        it('throws AgentToolError when method is invalid', async () => {
            const tool = new HttpRequestTool()
            await expect(
                tool.execute({ url: 'http://example.com', method: 'TRACE' }, 'agent', 'session')
            ).rejects.toThrow(AgentToolError)
        })
    })

    describe('allowedHosts validation', () => {
        it('throws AgentToolError when host is not in allowedHosts', async () => {
            const tool = new HttpRequestTool({ allowedHosts: ['allowed.com'] })
            await expect(tool.execute({ url: 'http://evil.com/path', method: 'GET' }, 'a', 's')).rejects.toThrow(
                AgentToolError
            )
        })

        it('allows requests to hosts in allowedHosts', async () => {
            const tool = new HttpRequestTool({ allowedHosts: ['allowed.com'] })
            await expect(
                tool.execute({ url: 'http://allowed.com/path', method: 'GET' }, 'a', 's')
            ).resolves.toBeDefined()
        })
    })

    describe('blockedHosts validation', () => {
        it('throws AgentToolError when host is in blockedHosts', async () => {
            const tool = new HttpRequestTool({ blockedHosts: ['bad.com'] })
            await expect(tool.execute({ url: 'http://bad.com/path', method: 'GET' }, 'a', 's')).rejects.toThrow(
                AgentToolError
            )
        })

        it('allows requests to non-blocked hosts', async () => {
            const tool = new HttpRequestTool({ blockedHosts: ['bad.com'] })
            await expect(tool.execute({ url: 'http://good.com/path', method: 'GET' }, 'a', 's')).resolves.toBeDefined()
        })
    })

    describe('response handling', () => {
        it('returns text body for non-JSON responses', async () => {
            fetchMock.mockResolvedValue(makeResponse(200, 'plain text', 'text/plain'))
            const tool = new HttpRequestTool()
            const result = await tool.execute({ url: 'http://example.com', method: 'GET' }, 'a', 's')
            const output = result as { body: string }
            expect(output.body).toBe('plain text')
        })

        it('returns body as string for JSON responses', async () => {
            fetchMock.mockResolvedValue(makeResponse(200, '{"key":"val"}', 'application/json'))
            const tool = new HttpRequestTool()
            const result = await tool.execute({ url: 'http://example.com', method: 'GET' }, 'a', 's')
            const output = result as { body: string }
            expect(output.body).toBe('{"key":"val"}')
        })

        it('returns the response status code', async () => {
            fetchMock.mockResolvedValue(makeResponse(404, 'not found', 'text/plain'))
            const tool = new HttpRequestTool()
            const result = await tool.execute({ url: 'http://example.com', method: 'GET' }, 'a', 's')
            const output = result as { status: number }
            expect(output.status).toBe(404)
        })
    })

    describe('timeout', () => {
        it('aborts the request once timeoutMs elapses', async () => {
            fetchMock.mockImplementation(
                () =>
                    new Promise(resolve => {
                        setTimeout(() => {
                            resolve(makeResponse())
                        }, 50)
                    })
            )
            const tool = new HttpRequestTool({ timeoutMs: 10 })
            const result = await tool.execute({ url: 'http://example.com', method: 'GET' }, 'a', 's')
            expect(result).toBeDefined()
        })
    })

    describe('defaultHeaders', () => {
        it('merges defaultHeaders with request headers', async () => {
            const tool = new HttpRequestTool({ defaultHeaders: { 'x-default': 'yes' } })
            await tool.execute({ url: 'http://example.com', method: 'GET', headers: { 'x-extra': 'extra' } }, 'a', 's')
            const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
            const headers = init.headers as Record<string, string>
            expect(headers['x-default']).toBe('yes')
            expect(headers['x-extra']).toBe('extra')
        })

        it('request headers override defaultHeaders on conflict', async () => {
            const tool = new HttpRequestTool({ defaultHeaders: { 'x-token': 'default' } })
            await tool.execute(
                { url: 'http://example.com', method: 'GET', headers: { 'x-token': 'override' } },
                'a',
                's'
            )
            const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
            const headers = init.headers as Record<string, string>
            expect(headers['x-token']).toBe('override')
        })
    })
})
