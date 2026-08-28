import { WriteMemoryTool } from '@tool/implementations/memory/WriteMemoryTool'
import { AgentToolError } from '@tool/errors'
import { makeMemoryRepositoryMock } from '../../../../../helpers/makeAgent'

describe('WriteMemoryTool', () => {
    it('has correct name', () => {
        const tool = new WriteMemoryTool(makeMemoryRepositoryMock())
        expect(tool.name).toBe('memory_write')
    })

    it('defaults to project scope when a working directory is present', async () => {
        const repository = makeMemoryRepositoryMock()
        const tool = new WriteMemoryTool(repository)
        await tool.execute({ content: 'a fact' }, 'agent-1', 'session-1', 'C:\\project')
        expect(repository.create).toHaveBeenCalledWith({ scope: 'project', owner: 'C:\\project' }, 'a fact', false)
    })

    it('defaults to agent scope when there is no working directory', async () => {
        const repository = makeMemoryRepositoryMock()
        const tool = new WriteMemoryTool(repository)
        await tool.execute({ content: 'a fact' }, 'agent-1', 'session-1')
        expect(repository.create).toHaveBeenCalledWith({ scope: 'agent', owner: 'agent-1' }, 'a fact', false)
    })

    it('respects an explicitly provided scope', async () => {
        const repository = makeMemoryRepositoryMock()
        const tool = new WriteMemoryTool(repository)
        await tool.execute({ content: 'a fact', scope: 'global' }, 'agent-1', 'session-1', 'C:\\project')
        expect(repository.create).toHaveBeenCalledWith({ scope: 'global' }, 'a fact', false)
    })

    it('defaults pinned to false when not provided', async () => {
        const repository = makeMemoryRepositoryMock()
        const tool = new WriteMemoryTool(repository)
        await tool.execute({ content: 'a fact', scope: 'global' }, 'agent-1', 'session-1')
        expect(repository.create).toHaveBeenCalledWith(expect.anything(), 'a fact', false)
    })

    it('passes pinned through when provided', async () => {
        const repository = makeMemoryRepositoryMock()
        const tool = new WriteMemoryTool(repository)
        await tool.execute({ content: 'a fact', scope: 'global', pinned: true }, 'agent-1', 'session-1')
        expect(repository.create).toHaveBeenCalledWith(expect.anything(), 'a fact', true)
    })

    it('throws AgentToolError when project scope is requested without a working directory', async () => {
        const tool = new WriteMemoryTool(makeMemoryRepositoryMock())
        await expect(tool.execute({ content: 'a fact', scope: 'project' }, 'agent-1', 'session-1')).rejects.toThrow(
            AgentToolError
        )
    })

    it('returns the created entry as a summary', async () => {
        const tool = new WriteMemoryTool(makeMemoryRepositoryMock())
        const result = (await tool.execute({ content: 'a fact', scope: 'global' }, 'agent-1', 'session-1')) as {
            content: string
            scope: string
        }
        expect(result.content).toBe('a fact')
        expect(result.scope).toBe('global')
    })

    it('throws AgentToolError for invalid schema (empty content)', async () => {
        const tool = new WriteMemoryTool(makeMemoryRepositoryMock())
        await expect(tool.execute({ content: '' }, 'agent-1', 'session-1')).rejects.toThrow(AgentToolError)
    })
})
