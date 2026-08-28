import { AgentInterface } from '../interfaces'
import { AgentConfig } from './AgentConfig'

export type AgentFactory = (config: AgentConfig) => AgentInterface
