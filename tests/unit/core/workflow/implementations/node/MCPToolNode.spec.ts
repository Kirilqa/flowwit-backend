import { WorkFlowNodeError } from '@workflow'
import { MCPToolNode } from '@workflow/implementations/node/MCPToolNode'
import { makeMCPClient, MCPClientMock } from '../../../../../helpers/makeMCPClient'
import { MCP_SERVER_STATUS } from '@mcp'
import { runNode } from '../../../../../helpers/runNode'
import { makeSimpleRegistry } from '../../../../../helpers/makeRegistry'

function makeRegistry(clients: Record<string, MCPClientMock> = {}) {
    return makeSimpleRegistry<MCPClientMock>(clients)
}

describe('MCPToolNode', () => {
    it('has type "mcp_tool"', () => {
        expect(new MCPToolNode(makeRegistry()).type).toBe('mcp_tool')
    })

    it('is not a start node', () => {
        expect(new MCPToolNode(makeRegistry()).isStart).toBe(false)
    })

    it('isReady when args port is provided', () => {
        const node = new MCPToolNode(makeRegistry())
        expect(node.isReady(new Set(['args']))).toBe(true)
    })

    it('throws WorkFlowNodeError when server is not found in registry', async () => {
        const node = new MCPToolNode(makeRegistry())
        await expect(runNode(node.execute({ args: {} }, { serverAlias: 'missing', toolName: 'tool' }))).rejects.toThrow(
            WorkFlowNodeError
        )
    })

    it('throws WorkFlowNodeError when server is not connected', async () => {
        const client = makeMCPClient()
        client.getStatus.mockReturnValue(MCP_SERVER_STATUS.DISCONNECTED)
        const node = new MCPToolNode(makeRegistry({ myserver: client }))
        await expect(
            runNode(node.execute({ args: {} }, { serverAlias: 'myserver', toolName: 'tool' }))
        ).rejects.toThrow(WorkFlowNodeError)
    })

    it('returns structuredContent when callTool result has it', async () => {
        const client = makeMCPClient()
        client.callTool.mockResolvedValue({
            content: [],
            isError: false,
            structuredContent: { answer: 42 }
        })
        const node = new MCPToolNode(makeRegistry({ myserver: client }))
        const { result } = await runNode(
            node.execute({ args: { query: 'test' } }, { serverAlias: 'myserver', toolName: 'my_tool' })
        )
        expect(result.output['result']).toEqual({ answer: 42 })
    })

    it('falls back to text extraction when no structuredContent', async () => {
        const client = makeMCPClient()
        client.callTool.mockResolvedValue({
            content: [{ type: 'text', text: 'hello from tool' }],
            isError: false
        })
        const node = new MCPToolNode(makeRegistry({ myserver: client }))
        const { result } = await runNode(node.execute({ args: {} }, { serverAlias: 'myserver', toolName: 'my_tool' }))
        expect(result.output['result']).toBe('hello from tool')
    })

    it('throws WorkFlowNodeError when callTool returns isError=true', async () => {
        const client = makeMCPClient()
        client.callTool.mockResolvedValue({
            content: [{ type: 'text', text: 'something failed' }],
            isError: true
        })
        const node = new MCPToolNode(makeRegistry({ myserver: client }))
        await expect(
            runNode(node.execute({ args: {} }, { serverAlias: 'myserver', toolName: 'my_tool' }))
        ).rejects.toThrow(WorkFlowNodeError)
    })

    it('wraps unexpected errors from callTool in WorkFlowNodeError', async () => {
        const client = makeMCPClient()
        client.callTool.mockRejectedValue(new Error('network error'))
        const node = new MCPToolNode(makeRegistry({ myserver: client }))
        await expect(
            runNode(node.execute({ args: {} }, { serverAlias: 'myserver', toolName: 'my_tool' }))
        ).rejects.toThrow(WorkFlowNodeError)
    })

    it('passes args to client.callTool', async () => {
        const client = makeMCPClient()
        client.callTool.mockResolvedValue({ content: [], isError: false })
        const node = new MCPToolNode(makeRegistry({ myserver: client }))
        await runNode(node.execute({ args: { x: 1, y: 2 } }, { serverAlias: 'myserver', toolName: 'my_tool' }))
        expect(client.callTool).toHaveBeenCalledWith('my_tool', { x: 1, y: 2 })
    })

    it('emits no events', async () => {
        const client = makeMCPClient()
        client.callTool.mockResolvedValue({ content: [], isError: false })
        const node = new MCPToolNode(makeRegistry({ myserver: client }))
        const { events } = await runNode(node.execute({ args: {} }, { serverAlias: 'myserver', toolName: 'my_tool' }))
        expect(events).toHaveLength(0)
    })
})
