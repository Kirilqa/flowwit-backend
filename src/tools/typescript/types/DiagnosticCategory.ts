export const DIAGNOSTIC_CATEGORY = {
    ERROR: 'error',
    WARNING: 'warning',
    SUGGESTION: 'suggestion',
    MESSAGE: 'message'
} as const

export type DiagnosticCategory = (typeof DIAGNOSTIC_CATEGORY)[keyof typeof DIAGNOSTIC_CATEGORY]
