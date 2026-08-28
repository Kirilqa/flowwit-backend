import { ErrorOptions } from '@core/types'
import { WorkFlowError } from './WorkFlowError'

export class WorkFlowRunAbortError extends WorkFlowError {
    constructor(message = 'WorkFlow run aborted', options?: ErrorOptions) {
        super(message, options)
    }
}
