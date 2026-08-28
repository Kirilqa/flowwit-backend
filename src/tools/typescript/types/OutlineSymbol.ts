import { OutlineSymbolKind } from './OutlineSymbolKind'

export type OutlineSymbol = {
    kind: OutlineSymbolKind
    name: string
    signature: string
    startLine: number
    endLine: number
}
