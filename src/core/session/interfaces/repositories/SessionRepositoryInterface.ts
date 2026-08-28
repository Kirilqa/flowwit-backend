import { InitializableInterface, RepositoryInterface } from '@core/interfaces'
import { SessionInterface } from '../SessionInterface'

export interface SessionRepositoryInterface extends RepositoryInterface<SessionInterface>, InitializableInterface {
    update(id: string, session: SessionInterface): Promise<SessionInterface>
}
