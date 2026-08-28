import { z } from 'zod'

export const globSearchToolSchema = z.object({
    pattern: z.string().describe('Glob pattern to search for (e.g. "**/*.ts", "src/**/index.ts", "**/*.{js,ts}")'),
    cwd: z.string().optional().describe('Directory to search from. Defaults to current working directory'),
    ignore: z
        .array(z.string())
        .optional()
        .describe('Glob patterns to exclude (e.g. ["**/node_modules/**", "**/dist/**"])'),
    onlyFiles: z.boolean().default(true).describe('Return only files. Set to false to include directories'),
    dot: z.boolean().default(false).describe('Include dot-files and dot-directories in results')
})
