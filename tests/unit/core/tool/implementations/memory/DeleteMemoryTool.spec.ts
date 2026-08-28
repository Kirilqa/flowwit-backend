import { DeleteMemoryTool } from '@tool/implementations/memory/DeleteMemoryTool'
import { AgentToolError } from '@tool/errors'
import { MemoryEntry } from '@memory'
import { makeMemoryRepositoryMock } from '../../../../../helpers/makeAgent'

function makeExistingEntry(overrides: Partial<MemoryEntry> = {}): MemoryEntry {
    return {
        id: 'entry-1',
        scope: 'global',
        content: 'content',
        pinned: false,
        createdAt: 1_000,
        updatedAt: 1_000,
        ...overrides
    }
}

describe('DeleteMemoryTool', () => {
    it('has correct name', () => {
        const tool = new DeleteMemoryTool(makeMemoryRepositoryMock())
        expect(tool.name).toBe('memory_delete')
    })

    it('throws AgentToolError when the entry does not exist', async () => {
        const tool = new DeleteMemoryTool(makeMemoryRepositoryMock())
        await expect(tool.execute({ scope: 'global', id: 'missing' }, 'agent-1', 'session-1')).rejects.toThrow(
            AgentToolError
        )
    })

    it('deletes the entry via the repository', async () => {
        const repository = makeMemoryRepositoryMock([makeExistingEntry()])
        const tool = new DeleteMemoryTool(repository)
        await tool.execute({ scope: 'global', id: 'entry-1' }, 'agent-1', 'session-1')
        expect(repository.delete).toHaveBeenCalledWith({ scope: 'global' }, 'entry-1')
    })

    it('returns a success message containing the entry id', async () => {
        const repository = makeMemoryRepositoryMock([makeExistingEntry()])
        const tool = new DeleteMemoryTool(repository)
        const result = await tool.execute({ scope: 'global', id: 'entry-1' }, 'agent-1', 'session-1')
        expect(result).toContain('entry-1')
    })

    it('throws AgentToolError when project scope is requested without a working directory', async () => {
        const tool = new DeleteMemoryTool(makeMemoryRepositoryMock())
        await expect(tool.execute({ scope: 'project', id: 'entry-1' }, 'agent-1', 'session-1')).rejects.toThrow(
            AgentToolError
        )
    })
})
