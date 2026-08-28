import { z } from 'zod'
import { WorkFlowNodeError } from '@workflow'
import { BaseNode } from '@workflow/implementations/node/bases/BaseNode'

const outputsSchema = z.object({ result: z.string() })
const configWithRequired = z.object({ name: z.string() })
const stateWithRequired = z.object({ count: z.number() })

class SimpleNode extends BaseNode {
    readonly type = 'simple'
    readonly isStart = false
    readonly outputs = outputsSchema
    resolvePortsThroughSchema(ports: Record<string, unknown>): Record<string, unknown> {
        return ports
    }
}

class NodeWithStrictConfig extends BaseNode<typeof configWithRequired> {
    readonly type = 'strict-config'
    readonly isStart = false
    readonly outputs = outputsSchema
    override readonly configSchema = configWithRequired
    resolvePortsThroughSchema(ports: Record<string, unknown>): Record<string, unknown> {
        return ports
    }
    testValidateState(state: Record<string, unknown>): unknown {
        return this.validateState(state)
    }
}

class NodeWithState extends BaseNode<typeof configWithRequired, typeof stateWithRequired> {
    readonly type = 'stateful'
    readonly isStart = false
    readonly outputs = outputsSchema
    override readonly configSchema = configWithRequired
    override readonly stateSchema = stateWithRequired
    resolvePortsThroughSchema(ports: Record<string, unknown>): Record<string, unknown> {
        return ports
    }
    testValidateState(state: Record<string, unknown>): unknown {
        return this.validateState(state)
    }
}

describe('BaseNode', () => {
    describe('outputsJsonSchema', () => {
        it('returns a JSON schema object', () => {
            const node = new SimpleNode()
            const schema = node.outputsJsonSchema
            expect(schema).toBeDefined()
            expect(typeof schema).toBe('object')
        })

        it('is cached — returns same reference on repeated access', () => {
            const node = new SimpleNode()
            expect(node.outputsJsonSchema).toBe(node.outputsJsonSchema)
        })
    })

    describe('configJsonSchema', () => {
        it('returns a JSON schema object', () => {
            const node = new SimpleNode()
            const schema = node.configJsonSchema
            expect(schema).toBeDefined()
            expect(typeof schema).toBe('object')
        })

        it('is cached — returns same reference on repeated access', () => {
            const node = new SimpleNode()
            expect(node.configJsonSchema).toBe(node.configJsonSchema)
        })
    })

    describe('stateJsonSchema', () => {
        it('returns a JSON schema object', () => {
            const node = new SimpleNode()
            const schema = node.stateJsonSchema
            expect(schema).toBeDefined()
            expect(typeof schema).toBe('object')
        })

        it('is cached — returns same reference on repeated access', () => {
            const node = new SimpleNode()
            expect(node.stateJsonSchema).toBe(node.stateJsonSchema)
        })
    })

    describe('resolveConfigThroughSchema', () => {
        it('returns original config when parsing fails (missing required field)', () => {
            const node = new NodeWithStrictConfig()
            const invalid: Record<string, unknown> = { age: 42 }
            const result = node.resolveConfigThroughSchema(invalid)
            expect(result).toBe(invalid)
        })

        it('returns parsed data when parsing succeeds', () => {
            const node = new NodeWithStrictConfig()
            const valid: Record<string, unknown> = { name: 'Alice' }
            const result = node.resolveConfigThroughSchema(valid)
            expect(result).toEqual({ name: 'Alice' })
        })
    })

    describe('validateState', () => {
        it('throws WorkFlowNodeError when state fails schema validation', () => {
            const node = new NodeWithState()
            expect(() => node.testValidateState({})).toThrow(WorkFlowNodeError)
        })

        it('error message contains the node type', () => {
            const node = new NodeWithState()
            expect(() => node.testValidateState({})).toThrow(/stateful/)
        })

        it('returns validated state when schema passes', () => {
            const node = new NodeWithState()
            const result = node.testValidateState({ count: 5 })
            expect(result).toEqual({ count: 5 })
        })
    })
})
