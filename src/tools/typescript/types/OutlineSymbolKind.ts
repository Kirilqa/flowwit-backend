export const OUTLINE_SYMBOL_KIND = {
    FUNCTION: 'function',
    ARROW_FUNCTION: 'arrow-function',
    CLASS: 'class',
    METHOD: 'method',
    CONSTRUCTOR: 'constructor',
    INTERFACE: 'interface',
    TYPE: 'type',
    ENUM: 'enum',
    VARIABLE: 'variable'
} as const

export type OutlineSymbolKind = (typeof OUTLINE_SYMBOL_KIND)[keyof typeof OUTLINE_SYMBOL_KIND]
