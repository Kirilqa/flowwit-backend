import { SessionInterface } from '@session'
import { MemoryInterface, MemoryRepositoryInterface } from '../interfaces'
import { MemoryEntry } from '../types'
import { resolveAllMemoryPartitions } from '../utils'

export class Memory implements MemoryInterface {
    constructor(
        private readonly repository: MemoryRepositoryInterface,
        private readonly persistentMaxLines: number,
        private readonly persistentMaxBytes: number
    ) {}

    async buildPrompt(agentId: string, session: SessionInterface): Promise<string | undefined> {
        const partitions = resolveAllMemoryPartitions(agentId, session.workingDirectory)

        const included: Array<MemoryEntry> = []
        let excludedCount = 0
        let usedLines = 0
        let usedBytes = 0
        let budgetExhausted = false

        for (const partition of partitions) {
            const pinnedEntries = (await this.repository.findAll(partition))
                .filter(entry => entry.pinned)
                .sort((a, b) => b.updatedAt - a.updatedAt)

            for (const entry of pinnedEntries) {
                if (budgetExhausted) {
                    excludedCount++
                    continue
                }

                const entryLines = entry.content.split('\n').length
                const entryBytes = Buffer.byteLength(entry.content, 'utf-8')

                if (
                    usedLines + entryLines > this.persistentMaxLines ||
                    usedBytes + entryBytes > this.persistentMaxBytes
                ) {
                    budgetExhausted = true
                    excludedCount++
                    continue
                }

                included.push(entry)
                usedLines += entryLines
                usedBytes += entryBytes
            }
        }

        if (included.length === 0) {
            return undefined
        }

        const digest = included.map(entry => `- [${entry.scope}] ${entry.content}`).join('\n')

        const overflowNotice =
            excludedCount > 0
                ? `\n\n(${excludedCount} more pinned ${excludedCount === 1 ? 'entry was' : 'entries were'} not shown due to the size limit — use memory_list to review.)`
                : ''

        return `## Memory\n${digest}${overflowNotice}`
    }

    async consolidate(_agentId: string, _session: SessionInterface): Promise<void> {}
}
