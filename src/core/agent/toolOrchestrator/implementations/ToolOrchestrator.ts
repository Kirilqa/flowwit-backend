import { createAbortPromise, getErrorMessage } from '@core/utils'
import { Tool } from '@provider'
import { MCP_SERVER_STATUS, MCPClientInterface } from '@mcp'
import { SessionManagerInterface } from '@session'
import { AgentConfig } from '@agent/types'
import {
    AgentAdapter,
    MCPPromptAdapter,
    MCPResourceAdapter,
    MCPToolAdapter,
    SkillAdapter,
    WorkFlowAdapter,
    ToolInterface,
    ToolCall,
    ToolResult,
    AgentToolError
} from '@tool'
import { ToolOrchestratorInterface } from '../interfaces'
import { WorkFlowRunnerInterface } from '@workflow'

export class ToolOrchestrator implements ToolOrchestratorInterface {
    constructor(
        private readonly sessionManager: SessionManagerInterface,
        private readonly workflowRunner: WorkFlowRunnerInterface,
        private readonly defaultTools: Array<ToolInterface>
    ) {}

    async buildPool(config: AgentConfig): Promise<Record<string, ToolInterface>> {
        const pool: Record<string, ToolInterface> = {}

        for (const tool of this.defaultTools) {
            pool[tool.name] = tool
        }

        for (const tool of config.tools ?? []) {
            pool[tool.name] = tool
        }

        for (const skill of config.skills ?? []) {
            const adapter = new SkillAdapter(skill)
            pool[adapter.name] = adapter
        }

        for (const agent of config.agents ?? []) {
            const adapter = new AgentAdapter(agent, this.sessionManager)
            pool[adapter.name] = adapter
        }

        for (const workflow of config.workflows ?? []) {
            const adapter = new WorkFlowAdapter(workflow, this.workflowRunner)
            pool[adapter.name] = adapter
        }

        for (const client of config.mcpServers ?? []) {
            if (client.getStatus() !== MCP_SERVER_STATUS.CONNECTED) {
                continue
            }

            const adapters = await this.buildMCPAdapters(client)
            Object.assign(pool, adapters)
        }

        return pool
    }

    buildTools(toolPool: Record<string, ToolInterface>): Array<Tool> {
        return Object.values(toolPool).map(tool => ({
            type: 'function' as const,
            function: {
                name: tool.name,
                description: tool.description,
                parameters: tool.parameters
            }
        }))
    }

    async execute(
        toolCall: ToolCall,
        toolPool: Record<string, ToolInterface>,
        agentId: string,
        sessionId: string,
        workingDirectory?: string,
        signal?: AbortSignal
    ): Promise<ToolResult> {
        const tool = toolPool[toolCall.name]

        if (!tool) {
            return {
                id: toolCall.id,
                name: toolCall.name,
                output: `Tool "${toolCall.name}" not found`,
                isError: true
            }
        }

        try {
            const executePromise = tool.execute(toolCall.arguments, agentId, sessionId, workingDirectory)

            if (signal !== undefined) {
                const { promise: abortPromise, cleanup } = createAbortPromise(
                    signal,
                    () => new AgentToolError(`Tool "${toolCall.name}" was aborted`)
                )

                try {
                    const output = await Promise.race([executePromise, abortPromise])
                    return { id: toolCall.id, name: toolCall.name, output, isError: false }
                } finally {
                    cleanup()
                }
            }

            const output = await executePromise
            return { id: toolCall.id, name: toolCall.name, output, isError: false }
        } catch (error) {
            return {
                id: toolCall.id,
                name: toolCall.name,
                output: getErrorMessage(error),
                isError: true
            }
        }
    }

    private async buildMCPAdapters(client: MCPClientInterface): Promise<Record<string, ToolInterface>> {
        const serverPrefix = client.alias.replace(/[^a-zA-Z0-9_-]/g, '_')
        const capabilities = client.getCapabilities()

        const [tools, resources, prompts] = await Promise.all([
            capabilities?.hasTools ? client.listTools() : Promise.resolve([]),
            capabilities?.hasResources ? client.listResources() : Promise.resolve([]),
            capabilities?.hasPrompts ? client.listPrompts() : Promise.resolve([])
        ])

        const adapters: Record<string, ToolInterface> = {}

        for (const tool of tools) {
            const toolName = tool.name.replace(/[^a-zA-Z0-9_-]/g, '_')
            const name = `${serverPrefix}__${toolName}`
            adapters[name] = new MCPToolAdapter(name, client, tool)
        }

        for (const resource of resources) {
            const resourceName = resource.name.replace(/[^a-zA-Z0-9_-]/g, '_')
            const name = `${serverPrefix}__resource__${resourceName}`
            adapters[name] = new MCPResourceAdapter(name, client, resource)
        }

        for (const prompt of prompts) {
            const promptName = prompt.name.replace(/[^a-zA-Z0-9_-]/g, '_')
            const name = `${serverPrefix}__prompt__${promptName}`
            adapters[name] = new MCPPromptAdapter(name, client, prompt)
        }

        return adapters
    }
}
