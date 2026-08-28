import { ErrorOptions } from '@core/types'
import { WorkFlowError } from './WorkFlowError'

export class WorkFlowRunError extends WorkFlowError {
    constructor(message = 'WorkFlow run error occurred', options?: ErrorOptions) {
        super(message, options)
    }
}
