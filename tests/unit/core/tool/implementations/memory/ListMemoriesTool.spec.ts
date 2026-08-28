import { ListMemoriesTool } from '@tool/implementations/memory/ListMemoriesTool'
import { AgentToolError } from '@tool/errors'
import { makeMemoryRepositoryMock } from '../../../../../helpers/makeAgent'

describe('ListMemoriesTool', () => {
    it('has correct name', () => {
        const tool = new ListMemoriesTool(makeMemoryRepositoryMock())
        expect(tool.name).toBe('memory_list')
    })

    it('lists all three scopes when no scope is provided and a working directory is present', async () => {
        const repository = makeMemoryRepositoryMock()
        const tool = new ListMemoriesTool(repository)
        await tool.execute({}, 'agent-1', 'session-1', 'C:\\project')
        expect(repository.findAll).toHaveBeenCalledTimes(3)
    })

    it('lists only the requested scope when scope is provided', async () => {
        const repository = makeMemoryRepositoryMock()
        const tool = new ListMemoriesTool(repository)
        await tool.execute({ scope: 'agent' }, 'agent-1', 'session-1')
        expect(repository.findAll).toHaveBeenCalledTimes(1)
        expect(repository.findAll).toHaveBeenCalledWith({ scope: 'agent', owner: 'agent-1' })
    })

    it('throws AgentToolError when project scope is requested without a working directory', async () => {
        const tool = new ListMemoriesTool(makeMemoryRepositoryMock())
        await expect(tool.execute({ scope: 'project' }, 'agent-1', 'session-1')).rejects.toThrow(AgentToolError)
    })
})
