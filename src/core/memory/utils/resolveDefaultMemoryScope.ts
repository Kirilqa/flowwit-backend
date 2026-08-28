import { MEMORY_SCOPE, MemoryScope } from '../types'

export function resolveDefaultMemoryScope(workingDirectory: string | undefined): MemoryScope {
    return workingDirectory !== undefined ? MEMORY_SCOPE.PROJECT : MEMORY_SCOPE.AGENT
}
