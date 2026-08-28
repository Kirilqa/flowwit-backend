import { CreateAgentToolsDependencies } from './CreateAgentToolsDependencies'

export type UpdateAgentToolDependencies = Omit<CreateAgentToolsDependencies, 'agentFactory'>
