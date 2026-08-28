import { ToolInterface } from '../../../interfaces'
import { CopyTool } from '../CopyTool'
import { CreateDirectoryTool } from '../CreateDirectoryTool'
import { DeleteTool } from '../DeleteTool'
import { FileInfoTool } from '../FileInfoTool'
import { GlobSearchTool } from '../GlobSearchTool'
import { ListDirectoryTool } from '../ListDirectoryTool'
import { MoveTool } from '../MoveTool'
import { PatchFileTool } from '../PatchFileTool'
import { ReadFileChunkTool } from '../ReadFileChunkTool'
import { ReadFileTool } from '../ReadFileTool'
import { SearchInFileTool } from '../SearchInFileTool'
import { WriteFileTool } from '../WriteFileTool'

export const createFileSystemTools = (): Array<ToolInterface> => {
    return [
        new ReadFileTool(),
        new ReadFileChunkTool(),
        new WriteFileTool(),
        new PatchFileTool(),
        new SearchInFileTool(),
        new DeleteTool(),
        new CopyTool(),
        new MoveTool(),
        new CreateDirectoryTool(),
        new ListDirectoryTool(),
        new GlobSearchTool(),
        new FileInfoTool()
    ]
}
