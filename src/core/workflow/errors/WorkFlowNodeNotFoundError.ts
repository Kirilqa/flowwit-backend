import { ErrorOptions } from '@core/types'
import { WorkFlowError } from './WorkFlowError'

export class WorkFlowNodeNotFoundError extends WorkFlowError {
    constructor(message = 'WorkFlow node not found', options?: ErrorOptions) {
        super(message, options)
    }
}
