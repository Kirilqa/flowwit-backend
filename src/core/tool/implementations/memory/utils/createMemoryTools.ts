import { MemoryRepositoryInterface } from '@memory'
import { ToolInterface } from '../../../interfaces'
import { DeleteMemoryTool } from '../DeleteMemoryTool'
import { ListMemoriesTool } from '../ListMemoriesTool'
import { SearchMemoryTool } from '../SearchMemoryTool'
import { UpdateMemoryTool } from '../UpdateMemoryTool'
import { WriteMemoryTool } from '../WriteMemoryTool'

export const createMemoryTools = (memoryRepository: MemoryRepositoryInterface): Array<ToolInterface> => {
    return [
        new WriteMemoryTool(memoryRepository),
        new SearchMemoryTool(memoryRepository),
        new ListMemoriesTool(memoryRepository),
        new UpdateMemoryTool(memoryRepository),
        new DeleteMemoryTool(memoryRepository)
    ]
}
