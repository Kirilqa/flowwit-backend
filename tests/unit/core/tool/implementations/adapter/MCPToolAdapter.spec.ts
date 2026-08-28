import { MCPToolAdapter } from '@tool/implementations/adapter/MCPToolAdapter'
import { AgentToolError } from '@tool/errors'
import { makeMCPClient } from '../../../../../helpers/makeMCPClient'
import { MCPToolDefinition } from '@mcp'

function makeDefinition(overrides: Partial<MCPToolDefinition> = {}): MCPToolDefinition {
    return {
        name: 'original_tool',
        description: 'Does something',
        inputSchema: { type: 'object', properties: {} },
        ...overrides
    }
}

describe('MCPToolAdapter', () => {
    describe('constructor', () => {
        it('stores the provided name', () => {
            const client = makeMCPClient()
            const adapter = new MCPToolAdapter('my_tool', client, makeDefinition())
            expect(adapter.name).toBe('my_tool')
        })

        it('uses definition.description as description', () => {
            const client = makeMCPClient()
            const adapter = new MCPToolAdapter('my_tool', client, makeDefinition({ description: 'Tool desc' }))
            expect(adapter.description).toBe('Tool desc')
        })

        it('defaults description to empty string when definition has none', () => {
            const client = makeMCPClient()
            const def: MCPToolDefinition = { name: 'original_tool', inputSchema: { type: 'object', properties: {} } }
            const adapter = new MCPToolAdapter('my_tool', client, def)
            expect(adapter.description).toBe('')
        })

        it('uses definition.inputSchema as parameters', () => {
            const client = makeMCPClient()
            const schema = { type: 'object', properties: { x: { type: 'string' } } }
            const adapter = new MCPToolAdapter('my_tool', client, makeDefinition({ inputSchema: schema }))
            expect(adapter.parameters).toBe(schema)
        })
    })

    describe('execute()', () => {
        it('calls client.callTool with the definition name (not adapter name)', async () => {
            const client = makeMCPClient()
            client.callTool.mockResolvedValue({ content: [], isError: false })
            const adapter = new MCPToolAdapter('alias_name', client, makeDefinition({ name: 'original_tool' }))
            await adapter.execute({ key: 'value' })
            expect(client.callTool).toHaveBeenCalledWith('original_tool', { key: 'value' })
        })

        it('returns structuredContent when present', async () => {
            const client = makeMCPClient()
            client.callTool.mockResolvedValue({
                content: [],
                isError: false,
                structuredContent: { answer: 42 }
            })
            const adapter = new MCPToolAdapter('tool', client, makeDefinition())
            const result = await adapter.execute({})
            expect(result).toEqual({ answer: 42 })
        })

        it('falls back to extracted text content when structuredContent is absent', async () => {
            const client = makeMCPClient()
            client.callTool.mockResolvedValue({
                content: [{ type: 'text', text: 'hello world' }],
                isError: false
            })
            const adapter = new MCPToolAdapter('tool', client, makeDefinition())
            const result = await adapter.execute({})
            expect(result).toBe('hello world')
        })

        it('joins multiple text content parts with newline', async () => {
            const client = makeMCPClient()
            client.callTool.mockResolvedValue({
                content: [
                    { type: 'text', text: 'line 1' },
                    { type: 'text', text: 'line 2' }
                ],
                isError: false
            })
            const adapter = new MCPToolAdapter('tool', client, makeDefinition())
            const result = await adapter.execute({})
            expect(result).toBe('line 1\nline 2')
        })

        it('ignores non-text content parts when extracting', async () => {
            const client = makeMCPClient()
            client.callTool.mockResolvedValue({
                content: [
                    { type: 'image', data: 'base64data', mimeType: 'image/png' },
                    { type: 'text', text: 'text part' }
                ],
                isError: false
            })
            const adapter = new MCPToolAdapter('tool', client, makeDefinition())
            const result = await adapter.execute({})
            expect(result).toBe('text part')
        })

        it('throws AgentToolError when result.isError is true', async () => {
            const client = makeMCPClient()
            client.callTool.mockResolvedValue({
                content: [{ type: 'text', text: 'something went wrong' }],
                isError: true
            })
            const adapter = new MCPToolAdapter('tool', client, makeDefinition())
            await expect(adapter.execute({})).rejects.toThrow(AgentToolError)
        })

        it('includes adapter name in AgentToolError message', async () => {
            const client = makeMCPClient()
            client.callTool.mockResolvedValue({ content: [], isError: true })
            const adapter = new MCPToolAdapter('my_tool', client, makeDefinition())
            await expect(adapter.execute({})).rejects.toThrow(/my_tool/)
        })
    })
})
