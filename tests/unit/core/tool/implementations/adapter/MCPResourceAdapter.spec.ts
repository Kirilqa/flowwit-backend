import { MCPResourceAdapter } from '@tool/implementations/adapter/MCPResourceAdapter'
import { makeMCPClient } from '../../../../../helpers/makeMCPClient'
import { MCPResource } from '@mcp'

function makeResource(overrides: Partial<MCPResource> = {}): MCPResource {
    return { uri: 'file://resource.txt', name: 'resource', description: 'A resource', ...overrides }
}

describe('MCPResourceAdapter', () => {
    describe('constructor', () => {
        it('stores the provided name', () => {
            const client = makeMCPClient()
            const adapter = new MCPResourceAdapter('my_resource', client, makeResource())
            expect(adapter.name).toBe('my_resource')
        })

        it('uses resource.description when present', () => {
            const client = makeMCPClient()
            const adapter = new MCPResourceAdapter('r', client, makeResource({ description: 'my desc' }))
            expect(adapter.description).toBe('my desc')
        })

        it('uses fallback description containing uri when resource has none', () => {
            const client = makeMCPClient()
            const adapter = new MCPResourceAdapter('r', client, { uri: 'file://data.json', name: 'resource' })
            expect(adapter.description).toContain('file://data.json')
        })

        it('has empty parameters schema', () => {
            const client = makeMCPClient()
            const adapter = new MCPResourceAdapter('r', client, makeResource())
            expect(adapter.parameters).toEqual({ type: 'object', properties: {}, required: [] })
        })
    })

    describe('execute()', () => {
        it('calls client.readResource with the resource uri', async () => {
            const client = makeMCPClient()
            client.readResource.mockResolvedValue({ uri: 'file://resource.txt', text: 'content' })
            const adapter = new MCPResourceAdapter('r', client, makeResource({ uri: 'file://resource.txt' }))
            await adapter.execute({})
            expect(client.readResource).toHaveBeenCalledWith('file://resource.txt')
        })

        it('returns text content from text resource', async () => {
            const client = makeMCPClient()
            client.readResource.mockResolvedValue({ uri: 'file://resource.txt', text: 'file contents' })
            const adapter = new MCPResourceAdapter('r', client, makeResource())
            const result = await adapter.execute({})
            expect(result).toBe('file contents')
        })

        it('returns blob content from blob resource', async () => {
            const client = makeMCPClient()
            client.readResource.mockResolvedValue({ uri: 'file://data.bin', blob: 'base64data==' })
            const adapter = new MCPResourceAdapter('r', client, makeResource({ uri: 'file://data.bin' }))
            const result = await adapter.execute({})
            expect(result).toBe('base64data==')
        })

        it('ignores args parameter', async () => {
            const client = makeMCPClient()
            client.readResource.mockResolvedValue({ uri: 'file://resource.txt', text: 'ok' })
            const adapter = new MCPResourceAdapter('r', client, makeResource())
            const result = await adapter.execute({ anything: 'ignored' })
            expect(result).toBe('ok')
        })
    })
})
