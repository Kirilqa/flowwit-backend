import { Memory } from '@memory/implementations/Memory'
import { MEMORY_SCOPE, MemoryEntry, MemoryPartition, MemoryRepositoryInterface } from '@memory'
import { makeSession } from '../../../../helpers/makeAgent'

let idCounter = 0

function makeEntry(scope: MemoryEntry['scope'], overrides: Partial<MemoryEntry> = {}): MemoryEntry {
    idCounter++
    return {
        id: `entry-${idCounter}`,
        scope,
        content: 'content',
        pinned: true,
        createdAt: 1_000,
        updatedAt: 1_000,
        ...overrides
    }
}

class FakeMemoryRepository implements MemoryRepositoryInterface {
    private readonly entries = new Map<string, Array<MemoryEntry>>()

    seed(partition: MemoryPartition, entries: Array<MemoryEntry>): void {
        this.entries.set(this.key(partition), entries)
    }

    async create(): Promise<MemoryEntry> {
        throw new Error('not implemented')
    }

    async findById(): Promise<MemoryEntry | null> {
        throw new Error('not implemented')
    }

    async findAll(partition: MemoryPartition): Promise<Array<MemoryEntry>> {
        return this.entries.get(this.key(partition)) ?? []
    }

    async update(): Promise<MemoryEntry> {
        throw new Error('not implemented')
    }

    async delete(): Promise<void> {
        throw new Error('not implemented')
    }

    async search(): Promise<Array<MemoryEntry>> {
        throw new Error('not implemented')
    }

    async ensureInitialized(): Promise<void> {}

    private key(partition: MemoryPartition): string {
        return `${partition.scope}:${partition.owner ?? ''}`
    }
}

const GLOBAL_PARTITION: MemoryPartition = { scope: MEMORY_SCOPE.GLOBAL }
const AGENT_PARTITION: MemoryPartition = { scope: MEMORY_SCOPE.AGENT, owner: 'agent-1' }
const PROJECT_PARTITION: MemoryPartition = { scope: MEMORY_SCOPE.PROJECT, owner: 'C:\\project' }

describe('Memory', () => {
    describe('buildPrompt()', () => {
        it('returns undefined when there are no pinned entries anywhere', async () => {
            const repository = new FakeMemoryRepository()
            const memory = new Memory(repository, 200, 25_600)
            const session = makeSession()
            expect(await memory.buildPrompt('agent-1', session)).toBeUndefined()
        })

        it('returns undefined when entries exist but none are pinned', async () => {
            const repository = new FakeMemoryRepository()
            repository.seed(GLOBAL_PARTITION, [makeEntry(MEMORY_SCOPE.GLOBAL, { pinned: false })])
            const memory = new Memory(repository, 200, 25_600)
            expect(await memory.buildPrompt('agent-1', makeSession())).toBeUndefined()
        })

        it('includes pinned entries tagged with their scope', async () => {
            const repository = new FakeMemoryRepository()
            repository.seed(GLOBAL_PARTITION, [makeEntry(MEMORY_SCOPE.GLOBAL, { content: 'user name is Kirill' })])
            const memory = new Memory(repository, 200, 25_600)
            const prompt = await memory.buildPrompt('agent-1', makeSession())
            expect(prompt).toContain('[global] user name is Kirill')
        })

        it('does not include non-pinned entries in the digest', async () => {
            const repository = new FakeMemoryRepository()
            repository.seed(GLOBAL_PARTITION, [
                makeEntry(MEMORY_SCOPE.GLOBAL, { content: 'pinned fact', pinned: true }),
                makeEntry(MEMORY_SCOPE.GLOBAL, { content: 'searchable fact', pinned: false })
            ])
            const memory = new Memory(repository, 200, 25_600)
            const prompt = await memory.buildPrompt('agent-1', makeSession())
            expect(prompt).toContain('pinned fact')
            expect(prompt).not.toContain('searchable fact')
        })

        it('lists global entries before agent entries', async () => {
            const repository = new FakeMemoryRepository()
            repository.seed(GLOBAL_PARTITION, [makeEntry(MEMORY_SCOPE.GLOBAL, { content: 'global fact' })])
            repository.seed(AGENT_PARTITION, [makeEntry(MEMORY_SCOPE.AGENT, { content: 'agent fact' })])
            const memory = new Memory(repository, 200, 25_600)
            const prompt = await memory.buildPrompt('agent-1', makeSession())
            const globalIndex = prompt?.indexOf('global fact') ?? -1
            const agentIndex = prompt?.indexOf('agent fact') ?? -1
            expect(globalIndex).toBeGreaterThanOrEqual(0)
            expect(agentIndex).toBeGreaterThan(globalIndex)
        })

        it('includes project entries only when the session has a working directory', async () => {
            const repository = new FakeMemoryRepository()
            repository.seed(PROJECT_PARTITION, [makeEntry(MEMORY_SCOPE.PROJECT, { content: 'project fact' })])
            const memory = new Memory(repository, 200, 25_600)

            const withoutDirectory = await memory.buildPrompt('agent-1', makeSession())
            expect(withoutDirectory).toBeUndefined()

            const session = makeSession()
            session.setWorkingDirectory('C:\\project')
            const withDirectory = await memory.buildPrompt('agent-1', session)
            expect(withDirectory).toContain('project fact')
        })

        it('sorts entries within a scope by recency, newest first', async () => {
            const repository = new FakeMemoryRepository()
            repository.seed(GLOBAL_PARTITION, [
                makeEntry(MEMORY_SCOPE.GLOBAL, { content: 'old fact', updatedAt: 1_000 }),
                makeEntry(MEMORY_SCOPE.GLOBAL, { content: 'new fact', updatedAt: 2_000 })
            ])
            const memory = new Memory(repository, 200, 25_600)
            const prompt = await memory.buildPrompt('agent-1', makeSession())
            const oldIndex = prompt?.indexOf('old fact') ?? -1
            const newIndex = prompt?.indexOf('new fact') ?? -1
            expect(newIndex).toBeGreaterThanOrEqual(0)
            expect(oldIndex).toBeGreaterThan(newIndex)
        })

        it('excludes entries once the line budget is exhausted and adds an overflow notice', async () => {
            const repository = new FakeMemoryRepository()
            repository.seed(GLOBAL_PARTITION, [
                makeEntry(MEMORY_SCOPE.GLOBAL, { content: 'fits', updatedAt: 2_000 }),
                makeEntry(MEMORY_SCOPE.GLOBAL, { content: 'excluded', updatedAt: 1_000 })
            ])
            const memory = new Memory(repository, 1, 25_600)
            const prompt = await memory.buildPrompt('agent-1', makeSession())
            expect(prompt).toContain('fits')
            expect(prompt).not.toContain('excluded')
            expect(prompt).toContain('1 more pinned entry was not shown')
        })

        it('uses plural wording in the overflow notice when more than one entry is excluded', async () => {
            const repository = new FakeMemoryRepository()
            repository.seed(GLOBAL_PARTITION, [
                makeEntry(MEMORY_SCOPE.GLOBAL, { content: 'fits', updatedAt: 3_000 }),
                makeEntry(MEMORY_SCOPE.GLOBAL, { content: 'excluded one', updatedAt: 2_000 }),
                makeEntry(MEMORY_SCOPE.GLOBAL, { content: 'excluded two', updatedAt: 1_000 })
            ])
            const memory = new Memory(repository, 1, 25_600)
            const prompt = await memory.buildPrompt('agent-1', makeSession())
            expect(prompt).toContain('2 more pinned entries were not shown')
        })

        it('excludes entries once the byte budget is exhausted', async () => {
            const repository = new FakeMemoryRepository()
            repository.seed(GLOBAL_PARTITION, [
                makeEntry(MEMORY_SCOPE.GLOBAL, { content: 'short', updatedAt: 2_000 }),
                makeEntry(MEMORY_SCOPE.GLOBAL, { content: 'a much longer fact that will not fit', updatedAt: 1_000 })
            ])
            const memory = new Memory(repository, 200, 10)
            const prompt = await memory.buildPrompt('agent-1', makeSession())
            expect(prompt).toContain('short')
            expect(prompt).not.toContain('a much longer fact')
        })

        it('does not add an overflow notice when everything fits', async () => {
            const repository = new FakeMemoryRepository()
            repository.seed(GLOBAL_PARTITION, [makeEntry(MEMORY_SCOPE.GLOBAL, { content: 'fits' })])
            const memory = new Memory(repository, 200, 25_600)
            const prompt = await memory.buildPrompt('agent-1', makeSession())
            expect(prompt).not.toContain('not shown')
        })
    })

    describe('consolidate()', () => {
        it('resolves without error', async () => {
            const repository = new FakeMemoryRepository()
            const memory = new Memory(repository, 200, 25_600)
            await expect(memory.consolidate('agent-1', makeSession())).resolves.toBeUndefined()
        })
    })
})
