import { NamedImport } from './NamedImport'

export type ImportEntry = {
    moduleSpecifier: string
    defaultImport: string | null
    namespaceImport: string | null
    namedImports: Array<NamedImport>
    isTypeOnly: boolean
}
