export type SearchMatchResult = {
    line: number
    match: string
    context: {
        before: Array<{ line: number; content: string }>
        after: Array<{ line: number; content: string }>
    }
}
