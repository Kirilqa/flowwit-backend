import { SessionInterface } from '@session'
import { MemoryInterface } from '../interfaces'

export class NoopMemory implements MemoryInterface {
    async buildPrompt(_agentId: string, _session: SessionInterface): Promise<string | undefined> {
        return undefined
    }

    async consolidate(_agentId: string, _session: SessionInterface): Promise<void> {}
}
