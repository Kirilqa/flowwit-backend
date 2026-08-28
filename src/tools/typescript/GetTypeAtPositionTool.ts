import { z } from 'zod'
import { BaseTypeScriptTool } from './BaseTypeScriptTool'
import { AgentToolError } from '@tool'
import { getTypeAtPositionToolSchema } from './validators'

export class GetTypeAtPositionTool extends BaseTypeScriptTool<typeof getTypeAtPositionToolSchema> {
    readonly name = 'typescript_get_type_at_position'
    readonly description =
        'Returns the TypeScript type of the expression at a given line and column in a file. Useful for understanding what type a variable, parameter, or expression has.'
    readonly schema = getTypeAtPositionToolSchema

    protected async run(args: z.infer<typeof getTypeAtPositionToolSchema>): Promise<string> {
        const { project } = await this.createProject(args.path, args.tsconfigPath)
        const sourceFile = this.addSourceFileToProject(project, args.path)

        const fullText = sourceFile.getFullText()
        const lines = fullText.split('\n')

        if (args.line > lines.length) {
            throw new AgentToolError(`Line ${args.line} is out of range. File has ${lines.length} lines.`)
        }

        const targetLine = lines[args.line - 1] ?? ''

        if (args.column > targetLine.length + 1) {
            throw new AgentToolError(
                `Column ${args.column} is out of range. Line ${args.line} has ${targetLine.length} characters.`
            )
        }

        const pos = sourceFile.compilerNode.getPositionOfLineAndCharacter(args.line - 1, args.column - 1)
        const node = sourceFile.getDescendantAtPos(pos)

        if (!node) {
            return `No expression found at line ${args.line}, column ${args.column}`
        }

        const typeChecker = project.getTypeChecker()
        const type = typeChecker.getTypeAtLocation(node)
        const typeText = typeChecker.getTypeText(type)
        const symbol = type.getSymbol()
        const symbolName = symbol?.getName()

        const output = [
            `Type at ${args.path}:${args.line}:${args.column}`,
            '',
            `Node:  ${node.getText().split('\n')[0] ?? ''}`,
            `Type:  ${typeText}`,
            ...(symbolName && symbolName !== typeText ? [`Symbol: ${symbolName}`] : [])
        ].join('\n')

        return output
    }
}
