import { SessionInterface } from '../interfaces'
import { SessionCreateOptions } from './SessionCreateOptions'

export type SessionFactory = (sessionId: string, options?: SessionCreateOptions) => SessionInterface
