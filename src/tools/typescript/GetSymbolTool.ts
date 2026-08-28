import { Node } from 'ts-morph'
import { z } from 'zod'
import { BaseTypeScriptTool } from './BaseTypeScriptTool'
import { getSymbolToolSchema } from './validators'

export class GetSymbolTool extends BaseTypeScriptTool<typeof getSymbolToolSchema> {
    readonly name = 'typescript_get_symbol'
    readonly description =
        'Returns the full implementation of a named symbol (function, class, method, interface, type, enum) from a TypeScript/JavaScript file, with line numbers. Use typescript_get_file_outline first to discover available symbols.'
    readonly schema = getSymbolToolSchema

    protected async run(args: z.infer<typeof getSymbolToolSchema>): Promise<string> {
        const sourceFile = this.getSourceFile(args.path)
        const { symbolName } = args

        const candidates: Array<{ text: string; startLine: number; endLine: number }> = []

        for (const declaration of sourceFile.getFunctions()) {
            if (declaration.getName() === symbolName) {
                candidates.push(this.extractNode(declaration))
            }
        }

        for (const statement of sourceFile.getVariableStatements()) {
            for (const declaration of statement.getDeclarations()) {
                if (declaration.getName() === symbolName) {
                    candidates.push(this.extractNode(statement))
                }
            }
        }

        for (const declaration of sourceFile.getClasses()) {
            if (declaration.getName() === symbolName) {
                candidates.push(this.extractNode(declaration))
                continue
            }

            for (const method of declaration.getMethods()) {
                const qualifiedName = `${declaration.getName()}.${method.getName()}`
                if (method.getName() === symbolName || qualifiedName === symbolName) {
                    candidates.push(this.extractNode(method))
                }
            }

            for (const constructor of declaration.getConstructors()) {
                const qualifiedName = `${declaration.getName()}.constructor`
                if (qualifiedName === symbolName) {
                    candidates.push(this.extractNode(constructor))
                }
            }
        }

        for (const declaration of sourceFile.getInterfaces()) {
            if (declaration.getName() === symbolName) {
                candidates.push(this.extractNode(declaration))
            }
        }

        for (const declaration of sourceFile.getTypeAliases()) {
            if (declaration.getName() === symbolName) {
                candidates.push(this.extractNode(declaration))
            }
        }

        for (const declaration of sourceFile.getEnums()) {
            if (declaration.getName() === symbolName) {
                candidates.push(this.extractNode(declaration))
            }
        }

        if (candidates.length === 0) {
            return `Symbol "${symbolName}" not found in "${args.path}". Use typescript_get_file_outline to see available symbols.`
        }

        return candidates.map(c => `// lines ${c.startLine}–${c.endLine}\n${c.text}`).join('\n\n')
    }

    private extractNode(node: Node): { text: string; startLine: number; endLine: number } {
        return {
            text: node.getText(),
            startLine: node.getStartLineNumber(),
            endLine: node.getEndLineNumber()
        }
    }
}
