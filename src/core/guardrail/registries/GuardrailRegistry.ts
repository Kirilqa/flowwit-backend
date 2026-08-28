import { BaseRegistry } from '@core/bases'
import { GuardrailRegistryInterface } from '../interfaces'
import { GuardrailInterface } from '../interfaces/GuardrailInterface'

export class GuardrailRegistry extends BaseRegistry<GuardrailInterface> implements GuardrailRegistryInterface {}
