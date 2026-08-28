import { z } from 'zod'

export const executeCommandToolSchema = z.object({
    command: z.string().describe('Shell command to execute'),
    cwd: z.string().optional().describe('Working directory for the command. Overrides the default cwd if set'),
    timeoutMs: z.number().optional().describe('Timeout in milliseconds. Overrides the default timeout if set')
})
