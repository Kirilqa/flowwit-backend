import { UpdateMemoryTool } from '@tool/implementations/memory/UpdateMemoryTool'
import { AgentToolError } from '@tool/errors'
import { MemoryEntry } from '@memory'
import { makeMemoryRepositoryMock } from '../../../../../helpers/makeAgent'

function makeExistingEntry(overrides: Partial<MemoryEntry> = {}): MemoryEntry {
    return {
        id: 'entry-1',
        scope: 'global',
        content: 'old content',
        pinned: false,
        createdAt: 1_000,
        updatedAt: 1_000,
        ...overrides
    }
}

describe('UpdateMemoryTool', () => {
    it('has correct name', () => {
        const tool = new UpdateMemoryTool(makeMemoryRepositoryMock())
        expect(tool.name).toBe('memory_update')
    })

    it('throws AgentToolError when the entry does not exist', async () => {
        const tool = new UpdateMemoryTool(makeMemoryRepositoryMock())
        await expect(
            tool.execute({ scope: 'global', id: 'missing', content: 'new' }, 'agent-1', 'session-1')
        ).rejects.toThrow(AgentToolError)
    })

    it('updates only the provided fields', async () => {
        const repository = makeMemoryRepositoryMock([makeExistingEntry()])
        const tool = new UpdateMemoryTool(repository)
        await tool.execute({ scope: 'global', id: 'entry-1', pinned: true }, 'agent-1', 'session-1')
        expect(repository.update).toHaveBeenCalledWith({ scope: 'global' }, 'entry-1', { pinned: true })
    })

    it('returns the updated entry as a summary', async () => {
        const repository = makeMemoryRepositoryMock([makeExistingEntry()])
        const tool = new UpdateMemoryTool(repository)
        const result = (await tool.execute(
            { scope: 'global', id: 'entry-1', content: 'new content' },
            'agent-1',
            'session-1'
        )) as { content: string }
        expect(result.content).toBe('new content')
    })

    it('throws AgentToolError when project scope is requested without a working directory', async () => {
        const tool = new UpdateMemoryTool(makeMemoryRepositoryMock())
        await expect(
            tool.execute({ scope: 'project', id: 'entry-1', content: 'x' }, 'agent-1', 'session-1')
        ).rejects.toThrow(AgentToolError)
    })

    it('throws AgentToolError for invalid schema (missing scope)', async () => {
        const tool = new UpdateMemoryTool(makeMemoryRepositoryMock())
        await expect(tool.execute({ id: 'entry-1' }, 'agent-1', 'session-1')).rejects.toThrow(AgentToolError)
    })
})
