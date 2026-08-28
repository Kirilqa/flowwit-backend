import { ErrorOptions } from '@core/types'
import { WorkFlowError } from './WorkFlowError'

export class WorkFlowNodeAlreadyExistsError extends WorkFlowError {
    constructor(message = 'WorkFlow node already exists', options?: ErrorOptions) {
        super(message, options)
    }
}
