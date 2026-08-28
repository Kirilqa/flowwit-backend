import { ErrorOptions } from '@core/types'
import { WorkFlowError } from './WorkFlowError'

export class WorkFlowConnectionError extends WorkFlowError {
    constructor(message = 'WorkFlow connection error occurred', options?: ErrorOptions) {
        super(message, options)
    }
}
