import { mcpServerConfigSchema } from '@mcp/validators/mcpServerConfigSchema'

describe('mcpServerConfigSchema', () => {
    describe('explicit type field', () => {
        it('accepts a valid stdio config with type', () => {
            const result = mcpServerConfigSchema.safeParse({ type: 'stdio', command: 'node' })
            expect(result.success).toBe(true)
        })

        it('accepts a valid streamable-http config with type', () => {
            const result = mcpServerConfigSchema.safeParse({ type: 'streamable-http', url: 'http://localhost:3000' })
            expect(result.success).toBe(true)
        })

        it('accepts a valid sse config with type', () => {
            const result = mcpServerConfigSchema.safeParse({ type: 'sse', url: 'http://localhost:3000/sse' })
            expect(result.success).toBe(true)
        })
    })

    describe('preprocessor — type inference', () => {
        it('infers type: stdio when command is present and type is absent', () => {
            const result = mcpServerConfigSchema.safeParse({ command: 'python', args: ['-m', 'server'] })
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data.type).toBe('stdio')
            }
        })

        it('infers type: streamable-http when url is present and type is absent', () => {
            const result = mcpServerConfigSchema.safeParse({ url: 'http://example.com' })
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data.type).toBe('streamable-http')
            }
        })

        it('passes through object as-is when neither url nor command are present', () => {
            const result = mcpServerConfigSchema.safeParse({ unknown: 'field' })
            expect(result.success).toBe(false)
        })

        it('passes through non-object values unchanged', () => {
            const result = mcpServerConfigSchema.safeParse('not-an-object')
            expect(result.success).toBe(false)
        })

        it('passes through null unchanged', () => {
            const result = mcpServerConfigSchema.safeParse(null)
            expect(result.success).toBe(false)
        })
    })

    describe('field validation', () => {
        it('rejects stdio config with empty command', () => {
            const result = mcpServerConfigSchema.safeParse({ type: 'stdio', command: '' })
            expect(result.success).toBe(false)
        })

        it('rejects http config with invalid url', () => {
            const result = mcpServerConfigSchema.safeParse({ type: 'streamable-http', url: 'not-a-url' })
            expect(result.success).toBe(false)
        })

        it('accepts optional args on stdio config', () => {
            const result = mcpServerConfigSchema.safeParse({ type: 'stdio', command: 'node', args: ['index.js'] })
            expect(result.success).toBe(true)
        })

        it('accepts optional headers on http config', () => {
            const result = mcpServerConfigSchema.safeParse({
                type: 'streamable-http',
                url: 'http://example.com',
                headers: { Authorization: 'Bearer token' }
            })
            expect(result.success).toBe(true)
        })
    })
})
