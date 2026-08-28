import { LoggerInterface } from '@logger'
import { AgentConfigError } from '../errors'
import { AgentConfigRegistryDependencies, AgentFactory, RawAgentConfig, RawAgentFactory } from '../types'
import { hydrateAgentConfig } from './hydrateAgentConfig'

export const createRawAgentFactory = (
    registryDependencies: AgentConfigRegistryDependencies,
    agentFactory: AgentFactory,
    logger: LoggerInterface,
    defaultTimezone?: string
): RawAgentFactory => {
    return (rawAgentConfig: RawAgentConfig) => {
        const config = hydrateAgentConfig(rawAgentConfig, registryDependencies, logger, defaultTimezone)

        if (config === null) {
            throw new AgentConfigError(
                `[AgentFactory] Failed to create agent "${rawAgentConfig.name}": provider or thinkingStrategy not found in registry`
            )
        }

        return agentFactory(config)
    }
}
