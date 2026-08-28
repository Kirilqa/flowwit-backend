import { z } from 'zod'
import { MEMORY_SCOPE } from '@memory'

export const writeMemoryToolSchema = z.object({
    content: z.string().min(1).describe('The fact or note to remember'),
    scope: z
        .enum([MEMORY_SCOPE.GLOBAL, MEMORY_SCOPE.AGENT, MEMORY_SCOPE.PROJECT])
        .optional()
        .describe(
            'Who this fact belongs to: global (any agent, any project), agent (only you), project (current working directory). Defaults to project when you have a working directory, otherwise agent. global must always be set explicitly.'
        ),
    pinned: z
        .boolean()
        .optional()
        .describe(
            'If true, this fact will always appear in your context on every future request in this scope, without needing to search for it. This has a real cost: it occupies context on every request, forever, and there is a hard size limit per scope. Use only for facts needed in almost every task within the scope, not case-specific details.'
        )
})
