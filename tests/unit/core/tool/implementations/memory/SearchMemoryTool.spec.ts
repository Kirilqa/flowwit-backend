import { SearchMemoryTool } from '@tool/implementations/memory/SearchMemoryTool'
import { AgentToolError } from '@tool/errors'
import { makeMemoryRepositoryMock } from '../../../../../helpers/makeAgent'

describe('SearchMemoryTool', () => {
    it('has correct name', () => {
        const tool = new SearchMemoryTool(makeMemoryRepositoryMock())
        expect(tool.name).toBe('memory_search')
    })

    it('searches all three scopes when no scope is provided and a working directory is present', async () => {
        const repository = makeMemoryRepositoryMock()
        const tool = new SearchMemoryTool(repository)
        await tool.execute({ query: 'fact' }, 'agent-1', 'session-1', 'C:\\project')
        expect(repository.search).toHaveBeenCalledTimes(3)
    })

    it('searches only global and agent scopes when there is no working directory', async () => {
        const repository = makeMemoryRepositoryMock()
        const tool = new SearchMemoryTool(repository)
        await tool.execute({ query: 'fact' }, 'agent-1', 'session-1')
        expect(repository.search).toHaveBeenCalledTimes(2)
    })

    it('searches only the requested scope when scope is provided', async () => {
        const repository = makeMemoryRepositoryMock()
        const tool = new SearchMemoryTool(repository)
        await tool.execute({ query: 'fact', scope: 'global' }, 'agent-1', 'session-1', 'C:\\project')
        expect(repository.search).toHaveBeenCalledTimes(1)
        expect(repository.search).toHaveBeenCalledWith({ scope: 'global' }, 'fact')
    })

    it('throws AgentToolError when project scope is requested without a working directory', async () => {
        const tool = new SearchMemoryTool(makeMemoryRepositoryMock())
        await expect(tool.execute({ query: 'fact', scope: 'project' }, 'agent-1', 'session-1')).rejects.toThrow(
            AgentToolError
        )
    })

    it('throws AgentToolError for invalid schema (empty query)', async () => {
        const tool = new SearchMemoryTool(makeMemoryRepositoryMock())
        await expect(tool.execute({ query: '' }, 'agent-1', 'session-1')).rejects.toThrow(AgentToolError)
    })
})
