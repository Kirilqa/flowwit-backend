import { ToolInterface } from '../../../interfaces'
import { CreateWorkFlowToolsDependencies } from '../types'
import { CreateWorkFlowTool } from '../CreateWorkFlowTool'
import { UpdateWorkFlowTool } from '../UpdateWorkFlowTool'
import { DeleteWorkFlowTool } from '../DeleteWorkFlowTool'
import { ListWorkFlowsTool } from '../ListWorkFlowsTool'
import { InfoWorkFlowTool } from '../InfoWorkFlowTool'
import { RegisterWorkFlowTool } from '../RegisterWorkFlowTool'
import { UnregisterWorkFlowTool } from '../UnregisterWorkFlowTool'
import { RunWorkFlowTool } from '../RunWorkFlowTool'
import { StopWorkFlowRunTool } from '../StopWorkFlowRunTool'
import { InfoWorkFlowRunTool } from '../InfoWorkFlowRunTool'
import { ListWorkFlowRunsTool } from '../ListWorkFlowRunsTool'
import { ListWorkFlowNodesTool } from '../ListWorkFlowNodesTool'

export function createWorkFlowTools(dependencies: CreateWorkFlowToolsDependencies): Array<ToolInterface> {
    const agentConfigRepository = dependencies.rawAgentConfigRepository ?? null

    return [
        new CreateWorkFlowTool(
            dependencies.workflowRepository,
            dependencies.workflowRegistry,
            dependencies.workflowNodeRegistry
        ),
        new UpdateWorkFlowTool(
            dependencies.workflowRepository,
            dependencies.workflowRegistry,
            dependencies.workflowNodeRegistry
        ),
        new DeleteWorkFlowTool(dependencies.workflowRepository, dependencies.workflowRegistry),
        new ListWorkFlowsTool(dependencies.workflowRegistry),
        new InfoWorkFlowTool(dependencies.workflowRegistry),
        new RegisterWorkFlowTool(dependencies.workflowRegistry, dependencies.agentRegistry, agentConfigRepository),
        new UnregisterWorkFlowTool(dependencies.agentRegistry, agentConfigRepository),
        new RunWorkFlowTool(
            dependencies.workflowRegistry,
            dependencies.workflowRunRepository,
            dependencies.workflowRunner
        ),
        new StopWorkFlowRunTool(dependencies.workflowRunner),
        new InfoWorkFlowRunTool(dependencies.workflowRunRepository),
        new ListWorkFlowRunsTool(dependencies.workflowRunRepository),
        new ListWorkFlowNodesTool(dependencies.workflowNodeRegistry)
    ]
}
