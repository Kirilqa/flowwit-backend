import { z } from 'zod'

export function flattenZodError(error: z.ZodError): {
    formErrors: Array<string>
    fieldErrors: Record<string, Array<string>>
} {
    const formErrors: Array<string> = []
    const fieldErrors: Record<string, Array<string>> = {}

    for (const issue of error.issues) {
        if (issue.path.length === 0) {
            formErrors.push(issue.message)
            continue
        }

        const key = String(issue.path[0])
        ;(fieldErrors[key] ??= []).push(issue.message)
    }

    return { formErrors, fieldErrors }
}
