export type ConstantMappingValue = {
    type: 'constant'
    data: string | number | boolean
}

export type ExpressionMappingValue = {
    type: 'expression'
    expression: string
}

export type FunctionMappingValue = {
    type: 'function'
    fn: (input: unknown, ports: Record<string, unknown>) => unknown
}

export type MappingValue = ConstantMappingValue | ExpressionMappingValue | FunctionMappingValue
