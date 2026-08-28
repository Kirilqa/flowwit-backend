import fg from 'fast-glob'
import path from 'path'
import { z } from 'zod'
import { AgentToolError } from '../../errors'
import { BaseFileSystemTool } from './bases/BaseFileSystemTool'
import { globSearchToolSchema } from './validators'

const DEFAULT_IGNORE_PATTERNS = [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/.git/**',
    '**/coverage/**',
    '**/.next/**',
    '**/.cache/**'
]

const MAX_RESULTS = 500
const MAX_OUTPUT_LENGTH = 40_000

export class GlobSearchTool extends BaseFileSystemTool<typeof globSearchToolSchema> {
    readonly name = 'filesystem_glob_search'
    readonly description =
        'Searches for files and directories matching a glob pattern. Supports wildcards like * (any file), ** (any depth), ? (any character), and {a,b} (alternatives). node_modules, dist, .git and similar folders are excluded by default.'
    readonly schema = globSearchToolSchema

    protected async run(
        args: z.infer<typeof globSearchToolSchema>,
        _agentId: string,
        _sessionId: string,
        workingDirectory?: string
    ): Promise<string> {
        const cwd = args.cwd
            ? this.resolvePath(args.cwd, workingDirectory)
            : (workingDirectory ?? this.rootDirectory ?? process.cwd())

        const ignore = [...DEFAULT_IGNORE_PATTERNS, ...(args.ignore ?? [])]

        const matches = await fg(args.pattern, {
            cwd,
            ignore,
            onlyFiles: args.onlyFiles,
            dot: args.dot,
            absolute: false,
            followSymbolicLinks: false
        })

        if (matches.length === 0) {
            return `No files found matching pattern "${args.pattern}"`
        }

        const truncated = matches.length > MAX_RESULTS
        const results = truncated ? matches.slice(0, MAX_RESULTS) : matches

        const sorted = results.map(f => path.normalize(f)).sort()

        const header = truncated
            ? `Found ${matches.length} matches for "${args.pattern}" (showing first ${MAX_RESULTS}):`
            : `Found ${matches.length} match${matches.length === 1 ? '' : 'es'} for "${args.pattern}":`

        const output = `${header}\n\n${sorted.join('\n')}`

        if (output.length > MAX_OUTPUT_LENGTH) {
            throw new AgentToolError(
                `Search result is too large (${output.length} chars, limit is ${MAX_OUTPUT_LENGTH}). Narrow the search by using a more specific pattern, adding ignore patterns, or searching from a subdirectory via the cwd option.`
            )
        }

        return output
    }
}
