import { WorkFlowRunnerPendingResult } from './WorkFlowRunnerPendingResult'

export type WorkFlowRunnerPendingItem = {
    index: number
    promise: Promise<WorkFlowRunnerPendingResult>
}
