import { BaseRegistry } from '@core/bases'
import { ToolRegistryInterface, ToolInterface } from '../interfaces'

export class ToolRegistry extends BaseRegistry<ToolInterface> implements ToolRegistryInterface {}
