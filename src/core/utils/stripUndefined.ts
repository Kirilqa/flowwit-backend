export function stripUndefined<TValue>(value: TValue): TValue {
    if (Array.isArray(value)) {
        const entries: Array<unknown> = value
        return entries.map(entry => stripUndefined(entry)) as TValue
    }

    if (value !== null && typeof value === 'object') {
        const result: Record<string, unknown> = {}

        for (const [key, entry] of Object.entries(value)) {
            if (entry !== undefined) result[key] = stripUndefined(entry)
        }

        return result as TValue
    }

    return value
}
