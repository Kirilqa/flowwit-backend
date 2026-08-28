import { DiagnosticCategory } from './DiagnosticCategory'

export type DiagnosticEntry = {
    category: DiagnosticCategory
    code: number
    message: string
    line: number | null
    column: number | null
}
