import { InitializableInterface, RepositoryInterface } from '@core/interfaces'
import { WorkFlowRunInterface } from '../WorkFlowRunInterface'

export interface WorkFlowRunRepositoryInterface
    extends RepositoryInterface<WorkFlowRunInterface>, InitializableInterface {
    update(id: string, worfFlowRun: WorkFlowRunInterface): Promise<WorkFlowRunInterface>
}
