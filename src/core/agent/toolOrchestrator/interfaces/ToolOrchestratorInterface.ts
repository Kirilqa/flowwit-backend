import { Tool } from '@provider'
import { AgentConfig } from '@agent/types'
import { ToolCall, ToolInterface, ToolResult } from '@tool'

export interface ToolOrchestratorInterface {
    buildPool(config: AgentConfig): Promise<Record<string, ToolInterface>>
    buildTools(toolPool: Record<string, ToolInterface>): Array<Tool>
    execute(
        toolCall: ToolCall,
        toolPool: Record<string, ToolInterface>,
        agentId: string,
        sessionId: string,
        workingDirectory?: string,
        signal?: AbortSignal
    ): Promise<ToolResult>
}
