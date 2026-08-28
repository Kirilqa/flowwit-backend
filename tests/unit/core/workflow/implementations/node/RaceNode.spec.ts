import { RaceNode } from '@workflow/implementations/node/RaceNode'
import { runNode } from '../../../../../helpers/runNode'

describe('RaceNode', () => {
    let node: RaceNode

    beforeEach(() => {
        node = new RaceNode()
    })

    it('has type "race" and is not a start node', () => {
        expect(node.type).toBe('race')
        expect(node.isStart).toBe(false)
    })

    describe('isReady', () => {
        it('returns true when port a is received', () => {
            expect(node.isReady(new Set(['a']))).toBe(true)
        })

        it('returns true when port b is received', () => {
            expect(node.isReady(new Set(['b']))).toBe(true)
        })

        it('returns true when both ports are received', () => {
            expect(node.isReady(new Set(['a', 'b']))).toBe(true)
        })

        it('returns false when neither port is received', () => {
            expect(node.isReady(new Set())).toBe(false)
        })
    })

    describe('execute', () => {
        it('returns a when only a is provided', async () => {
            const { result } = await runNode(node.execute({ a: 'from-a' }, {}))
            expect(result.output['result']).toBe('from-a')
        })

        it('returns b when only b is provided', async () => {
            const { result } = await runNode(node.execute({ b: 'from-b' }, {}))
            expect(result.output['result']).toBe('from-b')
        })

        it('prefers a over b when both are provided', async () => {
            const { result } = await runNode(node.execute({ a: 'from-a', b: 'from-b' }, {}))
            expect(result.output['result']).toBe('from-a')
        })

        it('emits no events', async () => {
            const { events } = await runNode(node.execute({ a: 'x' }, {}))
            expect(events).toHaveLength(0)
        })
    })
})
