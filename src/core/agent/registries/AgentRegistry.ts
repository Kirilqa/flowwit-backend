import { BaseRegistry } from '@core/bases'
import { AgentInterface, AgentRegistryInterface } from '../interfaces'

export class AgentRegistry extends BaseRegistry<AgentInterface> implements AgentRegistryInterface {}
