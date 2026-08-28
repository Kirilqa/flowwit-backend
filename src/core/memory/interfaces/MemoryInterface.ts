import { SessionInterface } from '@session'

export interface MemoryInterface {
    buildPrompt(agentId: string, session: SessionInterface): Promise<string | undefined>
    consolidate(agentId: string, session: SessionInterface): Promise<void>
}
