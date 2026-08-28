import path from 'path'
import { Node, SourceFile } from 'ts-morph'
import { z } from 'zod'
import { BaseTypeScriptTool } from './BaseTypeScriptTool'
import { ReferenceEntry } from './types'
import { findReferencesToolSchema } from './validators'

export class FindReferencesTool extends BaseTypeScriptTool<typeof findReferencesToolSchema> {
    readonly name = 'typescript_find_references'
    readonly description =
        'Finds all usages of a named symbol (function, class, method, variable, interface, type, enum) across the project. Use typescript_get_file_outline to discover symbol names first.'
    readonly schema = findReferencesToolSchema

    protected async run(args: z.infer<typeof findReferencesToolSchema>): Promise<string> {
        const { project } = await this.createProject(args.path, args.tsconfigPath)
        const sourceFile = this.addSourceFileToProject(project, args.path)
        const { symbolName } = args

        const node = this.findLocalSymbol(sourceFile, symbolName)

        if (!node || !Node.isIdentifier(node)) {
            return `Symbol "${symbolName}" not found in "${args.path}". Use typescript_get_file_outline to see available symbols.`
        }

        const referencedSymbols = node.findReferences()
        const references: Array<ReferenceEntry> = []

        for (const referencedSymbol of referencedSymbols) {
            for (const ref of referencedSymbol.getReferences()) {
                const refSourceFile = ref.getSourceFile()
                const pos = ref.getTextSpan().getStart()
                const { line, column } = refSourceFile.getLineAndColumnAtPos(pos)
                const lineText = refSourceFile.getFullText().split('\n')[line - 1] ?? ''

                references.push({
                    file: path.relative(process.cwd(), refSourceFile.getFilePath()),
                    line,
                    column,
                    text: lineText.trim()
                })
            }
        }

        if (references.length === 0) {
            return `No references found for "${symbolName}"`
        }

        const grouped = this.groupByFile(references)
        const output = this.formatGrouped(symbolName, grouped)

        return output
    }

    private findLocalSymbol(sourceFile: SourceFile, name: string) {
        return (
            sourceFile.getFunction(name)?.getNameNode() ??
            sourceFile.getClass(name)?.getNameNode() ??
            sourceFile.getInterface(name)?.getNameNode() ??
            sourceFile.getTypeAlias(name)?.getNameNode() ??
            sourceFile.getEnum(name)?.getNameNode() ??
            sourceFile.getVariableDeclaration(name)?.getNameNode() ??
            null
        )
    }

    private groupByFile(references: Array<ReferenceEntry>): Map<string, Array<ReferenceEntry>> {
        const grouped = new Map<string, Array<ReferenceEntry>>()

        for (const ref of references) {
            const existing = grouped.get(ref.file)
            if (existing) {
                existing.push(ref)
            } else {
                grouped.set(ref.file, [ref])
            }
        }

        return grouped
    }

    private formatGrouped(symbolName: string, grouped: Map<string, Array<ReferenceEntry>>): string {
        const totalCount = Array.from(grouped.values()).reduce((sum, refs) => sum + refs.length, 0)
        const lines: Array<string> = [
            `Found ${totalCount} reference${totalCount === 1 ? '' : 's'} to "${symbolName}" across ${grouped.size} file${grouped.size === 1 ? '' : 's'}:`,
            ''
        ]

        for (const [file, refs] of grouped) {
            lines.push(file)
            for (const ref of refs) {
                lines.push(`  ${ref.line}:${ref.column}  ${ref.text}`)
            }
            lines.push('')
        }

        return lines.join('\n').trimEnd()
    }
}
