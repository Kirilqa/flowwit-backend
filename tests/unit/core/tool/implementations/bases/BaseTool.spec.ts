import { z } from 'zod'
import { BaseTool } from '@tool/implementations/bases/BaseTool'
import { AgentToolError } from '@tool/errors/AgentToolError'

const testSchema = z.object({
    name: z.string(),
    value: z.number().optional()
})

const refinedSchema = z.object({ name: z.string() }).refine(() => false, { message: 'Root level error' })

class TestTool extends BaseTool<typeof testSchema> {
    readonly name = 'test-tool'
    readonly description = 'A test tool'
    readonly schema = testSchema

    protected async run(args: z.infer<typeof testSchema>): Promise<unknown> {
        return args
    }
}

class RefinedTool extends BaseTool<typeof refinedSchema> {
    readonly name = 'refined-tool'
    readonly description = 'Tool with root-level refine'
    readonly schema = refinedSchema

    protected async run(args: z.infer<typeof refinedSchema>): Promise<unknown> {
        return args
    }
}

describe('BaseTool', () => {
    let tool: TestTool

    beforeEach(() => {
        tool = new TestTool()
    })

    describe('parameters', () => {
        it('returns a JSON schema object', () => {
            const params = tool.parameters
            expect(typeof params).toBe('object')
            expect(params).not.toBeNull()
        })

        it('returns the same reference on repeated access (cached)', () => {
            const first = tool.parameters
            const second = tool.parameters
            expect(first).toBe(second)
        })

        it('reflects the zod schema fields', () => {
            const params = tool.parameters
            const properties = params['properties']
            expect(properties).toBeDefined()
        })
    })

    describe('execute()', () => {
        it('runs with valid arguments and returns the result', async () => {
            const result = await tool.execute({ name: 'hello' }, 'agent-1', 'session-1')
            expect(result).toEqual({ name: 'hello' })
        })

        it('passes optional fields when provided', async () => {
            const result = await tool.execute({ name: 'test', value: 42 }, 'agent-1', 'session-1')
            expect(result).toEqual({ name: 'test', value: 42 })
        })

        it('throws AgentToolError for invalid arguments', async () => {
            await expect(tool.execute({ name: 123 }, 'agent-1', 'session-1')).rejects.toThrow(AgentToolError)
        })

        it('error message includes the tool name', async () => {
            await expect(tool.execute({ value: 'not-a-number' }, 'agent-1', 'session-1')).rejects.toThrow('"test-tool"')
        })

        it('error message includes the field name', async () => {
            await expect(tool.execute({ name: 123 }, 'agent-1', 'session-1')).rejects.toThrow('name')
        })

        it('uses "input" as field name when error path is empty (root-level refine failure)', async () => {
            const refined = new RefinedTool()
            let message = ''
            try {
                await refined.execute({ name: 'hello' }, 'agent-1', 'session-1')
            } catch (e) {
                if (e instanceof AgentToolError) message = e.message
            }
            expect(message).toContain('input')
            expect(message).toContain('Root level error')
        })
    })
})
