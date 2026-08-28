import { createMemoryTools } from '@tool/implementations/memory/utils/createMemoryTools'
import { makeMemoryRepositoryMock } from '../../../../../../helpers/makeAgent'

describe('createMemoryTools', () => {
    it('returns all five memory management tools', () => {
        const tools = createMemoryTools(makeMemoryRepositoryMock())

        expect(tools.map(t => t.name).sort()).toEqual([
            'memory_delete',
            'memory_list',
            'memory_search',
            'memory_update',
            'memory_write'
        ])
    })
})
