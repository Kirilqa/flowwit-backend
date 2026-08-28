import { WorkFlowEvent } from '../types/WorkFlowEvent'
import { WorkFlowRunInterface } from './WorkFlowRunInterface'

export interface WorkFlowRunnerInterface {
    run(run: WorkFlowRunInterface): AsyncIterable<WorkFlowEvent>
    stop(runId: string): Promise<void>
}
