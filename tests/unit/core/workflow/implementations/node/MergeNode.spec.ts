import { MergeNode } from '@workflow/implementations/node/MergeNode'
import { runNode } from '../../../../../helpers/runNode'

describe('MergeNode', () => {
    let node: MergeNode

    beforeEach(() => {
        node = new MergeNode()
    })

    it('has type "merge" and is not a start node', () => {
        expect(node.type).toBe('merge')
        expect(node.isStart).toBe(false)
    })

    describe('isReady', () => {
        it('returns true when both a and b ports are received', () => {
            expect(node.isReady(new Set(['a', 'b']))).toBe(true)
        })

        it('returns false when only a is received', () => {
            expect(node.isReady(new Set(['a']))).toBe(false)
        })

        it('returns false when only b is received', () => {
            expect(node.isReady(new Set(['b']))).toBe(false)
        })

        it('returns false when neither port is received', () => {
            expect(node.isReady(new Set())).toBe(false)
        })
    })

    describe('execute', () => {
        it('merges a and b into result object', async () => {
            const { result } = await runNode(node.execute({ a: 'hello', b: 42 }, {}))
            expect(result.output['result']).toEqual({ a: 'hello', b: 42 })
        })

        it('places both object values in the merged output', async () => {
            const objA = { x: 1 }
            const objB = { y: 2 }
            const { result } = await runNode(node.execute({ a: objA, b: objB }, {}))
            expect(result.output['result']).toEqual({ a: objA, b: objB })
        })

        it('emits no events', async () => {
            const { events } = await runNode(node.execute({ a: 1, b: 2 }, {}))
            expect(events).toHaveLength(0)
        })
    })
})
