import { AgentInterface } from '../interfaces'
import { RawAgentConfig } from './RawAgentConfig'

export type RawAgentFactory = (config: RawAgentConfig) => AgentInterface
