import { SessionCreateOptions } from '../types/SessionCreateOptions'
import { SessionInterface } from './SessionInterface'

export interface SessionManagerInterface {
    create(sessionId: string, options?: SessionCreateOptions): Promise<SessionInterface>
    get(sessionId: string): Promise<SessionInterface | null>
    save(session: SessionInterface): Promise<void>
    list(): Promise<Array<SessionInterface>>
    delete(sessionId: string): Promise<void>
}
