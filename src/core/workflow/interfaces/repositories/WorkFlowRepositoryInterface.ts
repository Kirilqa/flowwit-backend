import { InitializableInterface, RepositoryInterface } from '@core/interfaces'
import { WorkFlowInterface } from '../WorkFlowInterface'

export interface WorkFlowRepositoryInterface extends RepositoryInterface<WorkFlowInterface>, InitializableInterface {
    update(id: string, workflow: WorkFlowInterface): Promise<WorkFlowInterface>
}
