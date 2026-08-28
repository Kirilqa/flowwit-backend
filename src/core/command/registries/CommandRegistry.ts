import { BaseRegistry } from '@core/bases'
import { CommandInterface } from '../interfaces'
import { CommandRegistryInterface } from '../interfaces/registries'

export class CommandRegistry extends BaseRegistry<CommandInterface> implements CommandRegistryInterface {}
