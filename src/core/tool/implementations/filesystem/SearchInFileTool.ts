import fs from 'fs/promises'
import { z } from 'zod'
import { AgentToolError } from '../../errors'
import { BaseFileSystemTool } from './bases/BaseFileSystemTool'
import { SearchMatchResult } from './types'
import { searchInFileToolSchema } from './validators'

export class SearchInFileTool extends BaseFileSystemTool<typeof searchInFileToolSchema> {
    readonly name = 'filesystem_search_in_file'
    readonly description =
        'Searches for a string or regex pattern inside a file. Returns matching lines with surrounding context and line numbers.'
    readonly schema = searchInFileToolSchema

    protected async run(
        args: z.infer<typeof searchInFileToolSchema>,
        _agentId: string,
        _sessionId: string,
        workingDirectory?: string
    ): Promise<string> {
        const resolved = this.resolvePath(args.path, workingDirectory)
        const content = await fs.readFile(resolved, 'utf-8')
        const lines = content.split('\n')

        let pattern: RegExp

        try {
            pattern = args.isRegex ? new RegExp(args.query, 'g') : new RegExp(this.escapeRegExp(args.query), 'g')
        } catch {
            throw new AgentToolError(`Invalid regular expression: "${args.query}"`)
        }

        const matches: Array<SearchMatchResult> = []

        for (const [i, line] of lines.entries()) {
            pattern.lastIndex = 0

            if (!pattern.test(line)) continue

            const lineNumber = i + 1
            const beforeStart = Math.max(0, i - args.contextLines)
            const afterEnd = Math.min(lines.length - 1, i + args.contextLines)

            matches.push({
                line: lineNumber,
                match: line,
                context: {
                    before: lines.slice(beforeStart, i).map((c, idx) => ({ line: beforeStart + idx + 1, content: c })),
                    after: lines.slice(i + 1, afterEnd + 1).map((c, idx) => ({ line: i + 2 + idx, content: c }))
                }
            })
        }

        if (matches.length === 0) {
            return `No matches found for "${args.query}"`
        }

        const output = matches.map(m => this.formatMatch(m)).join('\n\n---\n\n')

        return `Found ${matches.length} match${matches.length === 1 ? '' : 'es'}:\n\n${output}`
    }

    private formatMatch(match: SearchMatchResult): string {
        const lines: Array<string> = []

        for (const { line, content } of match.context.before) {
            lines.push(`  ${line}: ${content}`)
        }

        lines.push(`> ${match.line}: ${match.match}`)

        for (const { line, content } of match.context.after) {
            lines.push(`  ${line}: ${content}`)
        }

        return lines.join('\n')
    }

    private escapeRegExp(value: string): string {
        return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    }
}
