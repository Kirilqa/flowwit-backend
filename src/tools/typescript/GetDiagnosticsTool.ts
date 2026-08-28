import { DiagnosticCategory, ts } from 'ts-morph'
import { z } from 'zod'
import { BaseTypeScriptTool } from './BaseTypeScriptTool'
import { DIAGNOSTIC_CATEGORY, DiagnosticEntry } from './types'
import { getDiagnosticsToolSchema } from './validators'

export class GetDiagnosticsTool extends BaseTypeScriptTool<typeof getDiagnosticsToolSchema> {
    readonly name = 'typescript_get_diagnostics'
    readonly description =
        'Checks a TypeScript file for compiler errors and warnings. Auto-discovers tsconfig.json by traversing up from the file directory if not provided.'
    readonly schema = getDiagnosticsToolSchema

    protected async run(args: z.infer<typeof getDiagnosticsToolSchema>): Promise<string> {
        const { project, resolvedTsconfigPath } = await this.createProject(args.path, args.tsconfigPath)
        const sourceFile = this.addSourceFileToProject(project, args.path)
        const diagnostics = sourceFile.getPreEmitDiagnostics()

        if (diagnostics.length === 0) {
            return resolvedTsconfigPath
                ? `No errors found in "${args.path}" (tsconfig: "${resolvedTsconfigPath}")`
                : `No errors found in "${args.path}" (no tsconfig — limited type checking)`
        }

        const entries: Array<DiagnosticEntry> = diagnostics.map(d => {
            const start = d.getStart()
            const sourceFileRef = d.getSourceFile()
            const lineAndCol = start !== undefined && sourceFileRef ? sourceFileRef.getLineAndColumnAtPos(start) : null

            return {
                category: this.mapCategory(d.getCategory()),
                code: d.getCode(),
                message: ts.flattenDiagnosticMessageText(d.compilerObject.messageText, '\n'),
                line: lineAndCol?.line ?? null,
                column: lineAndCol?.column ?? null
            }
        })

        const tsconfigNote = resolvedTsconfigPath
            ? `tsconfig: "${resolvedTsconfigPath}"`
            : 'no tsconfig — limited type checking'

        const output = [
            `Found ${entries.length} issue${entries.length === 1 ? '' : 's'} in "${args.path}" (${tsconfigNote}):`,
            '',
            ...entries.map(e => this.formatEntry(e))
        ].join('\n')

        return output
    }

    private mapCategory(category: DiagnosticCategory): DiagnosticEntry['category'] {
        switch (category) {
            case ts.DiagnosticCategory.Error:
                return DIAGNOSTIC_CATEGORY.ERROR
            case ts.DiagnosticCategory.Warning:
                return DIAGNOSTIC_CATEGORY.WARNING
            case ts.DiagnosticCategory.Suggestion:
                return DIAGNOSTIC_CATEGORY.SUGGESTION
            default:
                return DIAGNOSTIC_CATEGORY.MESSAGE
        }
    }

    private formatEntry(entry: DiagnosticEntry): string {
        const location =
            entry.line !== null && entry.column !== null
                ? `line ${entry.line}, col ${entry.column}`
                : 'unknown location'

        return `[${entry.category.toUpperCase()}] TS${entry.code} at ${location}: ${entry.message}`
    }
}
