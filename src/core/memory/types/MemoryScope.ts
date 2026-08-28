export const MEMORY_SCOPE = {
    GLOBAL: 'global',
    AGENT: 'agent',
    PROJECT: 'project'
} as const

export type MemoryScope = (typeof MEMORY_SCOPE)[keyof typeof MEMORY_SCOPE]
