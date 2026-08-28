import { createMCPTools } from '@tool/implementations/mcp/utils/createMCPTools'
import { MCPClientFactory } from '@mcp'
import { makeMCPServerConfigRepository } from '../../../../../../helpers/makeMCPClient'
import {
    makeAgentRegistry,
    makeMCPServerRegistryMock,
    makeRawAgentConfigRepository
} from '../../../../../../helpers/makeAgent'

describe('createMCPTools', () => {
    it('returns all seven MCP management tools', () => {
        const tools = createMCPTools(
            jest.fn() as MCPClientFactory,
            makeMCPServerConfigRepository(),
            makeMCPServerRegistryMock(),
            makeAgentRegistry()
        )

        expect(tools.map(t => t.name).sort()).toEqual([
            'mcp_add',
            'mcp_delete',
            'mcp_info',
            'mcp_list',
            'mcp_register',
            'mcp_unregister',
            'mcp_update'
        ])
    })

    it('passes the provided agentConfigRepository through to the register/unregister tools', () => {
        const repo = makeRawAgentConfigRepository()
        const tools = createMCPTools(
            jest.fn() as MCPClientFactory,
            makeMCPServerConfigRepository(),
            makeMCPServerRegistryMock(),
            makeAgentRegistry(),
            repo
        )

        expect(tools).toHaveLength(7)
    })

    it('defaults agentConfigRepository to null when not provided', () => {
        const tools = createMCPTools(
            jest.fn() as MCPClientFactory,
            makeMCPServerConfigRepository(),
            makeMCPServerRegistryMock(),
            makeAgentRegistry()
        )

        expect(tools).toHaveLength(7)
    })
})
