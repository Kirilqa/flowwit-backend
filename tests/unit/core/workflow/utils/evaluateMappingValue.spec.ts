import { ConstantMappingValue, ExpressionMappingValue, FunctionMappingValue } from '@workflow'
import { evaluateMappingValue } from '@workflow/utils/evaluateMappingValue'

const ports: Record<string, unknown> = { value: 'port-data', count: 3 }

describe('evaluateMappingValue', () => {
    describe('constant type', () => {
        it('returns the data value as-is for a string', () => {
            const mapping: ConstantMappingValue = { type: 'constant', data: 'hello' }
            expect(evaluateMappingValue(mapping, ports)).toBe('hello')
        })

        it('returns the data value as-is for a number', () => {
            const mapping: ConstantMappingValue = { type: 'constant', data: 42 }
            expect(evaluateMappingValue(mapping, ports)).toBe(42)
        })

        it('returns the data value as-is for a boolean', () => {
            const mapping: ConstantMappingValue = { type: 'constant', data: true }
            expect(evaluateMappingValue(mapping, ports)).toBe(true)
        })

        it('ignores portInput and portData', () => {
            const mapping: ConstantMappingValue = { type: 'constant', data: 'fixed' }
            expect(evaluateMappingValue(mapping, ports, 'some-input')).toBe('fixed')
        })
    })

    describe('function type', () => {
        it('calls the function with portInput as first argument', () => {
            const fn = jest.fn().mockReturnValue('result')
            const mapping: FunctionMappingValue = { type: 'function', fn }
            evaluateMappingValue(mapping, ports, 'my-input')
            expect(fn).toHaveBeenCalledWith('my-input', ports)
        })

        it('calls the function with portData as second argument', () => {
            const fn = jest.fn().mockReturnValue('result')
            const mapping: FunctionMappingValue = { type: 'function', fn }
            evaluateMappingValue(mapping, ports, 'input')
            expect(fn.mock.calls[0]?.[1]).toBe(ports)
        })

        it('returns the function result', () => {
            const mapping: FunctionMappingValue = { type: 'function', fn: input => `transformed:${String(input)}` }
            expect(evaluateMappingValue(mapping, ports, 'hello')).toBe('transformed:hello')
        })
    })

    describe('expression type', () => {
        it('evaluates a simple arithmetic expression', () => {
            const mapping: ExpressionMappingValue = { type: 'expression', expression: '1 + 2' }
            expect(evaluateMappingValue(mapping, ports)).toBe(3)
        })

        it('provides $input as portInput in the context', () => {
            const mapping: ExpressionMappingValue = { type: 'expression', expression: '$input' }
            expect(evaluateMappingValue(mapping, ports, 'hello')).toBe('hello')
        })

        it('provides $ports as portData in the context', () => {
            const mapping: ExpressionMappingValue = { type: 'expression', expression: '$ports.value' }
            expect(evaluateMappingValue(mapping, ports, undefined)).toBe('port-data')
        })

        it('evaluates a string transformation on $input', () => {
            const mapping: ExpressionMappingValue = { type: 'expression', expression: '$input.toUpperCase()' }
            expect(evaluateMappingValue(mapping, ports, 'hello')).toBe('HELLO')
        })

        it('evaluates arithmetic on $ports values', () => {
            const mapping: ExpressionMappingValue = { type: 'expression', expression: '$ports.count * 2' }
            expect(evaluateMappingValue(mapping, ports, undefined)).toBe(6)
        })

        it('throws on invalid expression syntax', () => {
            const mapping: ExpressionMappingValue = { type: 'expression', expression: '(((' }
            expect(() => evaluateMappingValue(mapping, ports)).toThrow()
        })

        it('throws on runtime error in expression', () => {
            const mapping: ExpressionMappingValue = { type: 'expression', expression: '$input.nonexistent.deep' }
            expect(() => evaluateMappingValue(mapping, {}, null)).toThrow()
        })
    })
})
