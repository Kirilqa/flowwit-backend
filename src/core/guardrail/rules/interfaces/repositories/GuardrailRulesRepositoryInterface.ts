import { InitializableInterface } from '@core/interfaces'
import { GuardrailRulesData } from '../../types'

export interface GuardrailRulesRepositoryInterface extends InitializableInterface {
    load(): Promise<GuardrailRulesData>
    save(data: GuardrailRulesData): Promise<void>
}
