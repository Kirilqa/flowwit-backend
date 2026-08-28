import { Agent } from '../implementations/Agent'
import { AgentConfig, AgentDependencies, AgentFactory } from '../types'

export const createAgentFactory = (agentDependencies: AgentDependencies): AgentFactory => {
    return (agentConfig: AgentConfig) => {
        return new Agent(agentConfig, agentDependencies)
    }
}
