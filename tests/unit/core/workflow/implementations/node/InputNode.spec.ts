import { InputNode } from '@workflow/implementations/node/InputNode'
import { runNode } from '../../../../../helpers/runNode'

describe('InputNode', () => {
    let node: InputNode

    beforeEach(() => {
        node = new InputNode()
    })

    it('has type "input" and is a start node', () => {
        expect(node.type).toBe('input')
        expect(node.isStart).toBe(true)
    })

    describe('isReady', () => {
        it('returns true when $input is received', () => {
            expect(node.isReady(new Set(['$input']))).toBe(true)
        })

        it('returns false when $input is not received', () => {
            expect(node.isReady(new Set())).toBe(false)
        })

        it('returns false when other ports are present but not $input', () => {
            expect(node.isReady(new Set(['value', 'other']))).toBe(false)
        })
    })

    describe('execute', () => {
        it('passes string input through as result', async () => {
            const { result } = await runNode(node.execute({ $input: 'hello' }, {}))
            expect(result.output['result']).toBe('hello')
        })

        it('passes number input through as result', async () => {
            const { result } = await runNode(node.execute({ $input: 42 }, {}))
            expect(result.output['result']).toBe(42)
        })

        it('passes object input through as result', async () => {
            const value = { key: 'data' }
            const { result } = await runNode(node.execute({ $input: value }, {}))
            expect(result.output['result']).toBe(value)
        })

        it('passes null through as result', async () => {
            const { result } = await runNode(node.execute({ $input: null }, {}))
            expect(result.output['result']).toBeNull()
        })

        it('emits no events', async () => {
            const { events } = await runNode(node.execute({ $input: 'test' }, {}))
            expect(events).toHaveLength(0)
        })
    })
})
