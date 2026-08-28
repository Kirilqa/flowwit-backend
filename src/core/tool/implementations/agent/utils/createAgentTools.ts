import { ToolInterface } from '../../../interfaces'
import { CreateAgentTool } from '../CreateAgentTool'
import { DeleteAgentTool } from '../DeleteAgentTool'
import { InfoAgentTool } from '../InfoAgentTool'
import { ListAgentsTool } from '../ListAgentsTool'
import { RegisterAgentTool } from '../RegisterAgentTool'
import { UnregisterAgentTool } from '../UnregisterAgentTool'
import { UpdateAgentTool } from '../UpdateAgentTool'
import { CreateAgentToolsDependencies } from '../types'

export const createAgentTools = (dependencies: CreateAgentToolsDependencies): Array<ToolInterface> => {
    const agentConfigRepository = dependencies.rawAgentConfigRepository ?? null

    return [
        new CreateAgentTool(
            dependencies.rawAgentFactory,
            dependencies.agentRegistry,
            agentConfigRepository,
            dependencies.guardrailRegistry
        ),
        new UpdateAgentTool(dependencies),
        new DeleteAgentTool(dependencies.agentRegistry, agentConfigRepository),
        new ListAgentsTool(dependencies.agentRegistry, agentConfigRepository),
        new InfoAgentTool(dependencies.agentRegistry, agentConfigRepository),
        new RegisterAgentTool(dependencies.agentRegistry, agentConfigRepository),
        new UnregisterAgentTool(dependencies.agentRegistry, agentConfigRepository)
    ]
}
