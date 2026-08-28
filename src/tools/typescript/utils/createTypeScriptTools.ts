import { ToolInterface } from '@tool'
import { FindReferencesTool } from '../FindReferencesTool'
import { GetDiagnosticsTool } from '../GetDiagnosticsTool'
import { GetFileOutlineTool } from '../GetFileOutlineTool'
import { GetImportsTool } from '../GetImportsTool'
import { GetSymbolTool } from '../GetSymbolTool'
import { GetTypeAtPositionTool } from '../GetTypeAtPositionTool'

export const createTypeScriptTools = (): Array<ToolInterface> => {
    return [
        new GetFileOutlineTool(),
        new GetImportsTool(),
        new GetSymbolTool(),
        new GetDiagnosticsTool(),
        new FindReferencesTool(),
        new GetTypeAtPositionTool()
    ]
}
