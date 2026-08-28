import { ErrorOptions } from '@core/types'
import { WorkFlowError } from './WorkFlowError'

export class WorkFlowNodeError extends WorkFlowError {
    constructor(message = 'WorkFlow node error occurred', options?: ErrorOptions) {
        super(message, options)
    }
}
