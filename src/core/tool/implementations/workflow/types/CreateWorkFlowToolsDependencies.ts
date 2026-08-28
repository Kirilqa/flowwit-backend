import { AgentRegistryInterface, RawAgentConfigRepositoryInterface } from '@agent'
import {
    WorkFlowNodeRegistryInterface,
    WorkFlowRegistryInterface,
    WorkFlowRepositoryInterface,
    WorkFlowRunRepositoryInterface,
    WorkFlowRunnerInterface
} from '@workflow'

export type CreateWorkFlowToolsDependencies = {
    workflowRegistry: WorkFlowRegistryInterface
    workflowRepository: WorkFlowRepositoryInterface
    workflowRunRepository: WorkFlowRunRepositoryInterface
    workflowRunner: WorkFlowRunnerInterface
    workflowNodeRegistry: WorkFlowNodeRegistryInterface
    agentRegistry: AgentRegistryInterface
    rawAgentConfigRepository?: RawAgentConfigRepositoryInterface
}
