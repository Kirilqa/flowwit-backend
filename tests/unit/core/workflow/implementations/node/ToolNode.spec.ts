import { WorkFlowNodeError } from '@workflow'
import { ToolNode } from '@workflow/implementations/node/ToolNode'
import { ToolInterface } from '@tool'
import { runNode } from '../../../../../helpers/runNode'
import { makeSimpleRegistry } from '../../../../../helpers/makeRegistry'

function makeTool(executeResult: unknown = 'tool-result'): ToolInterface {
    return {
        name: 'my_tool',
        description: 'A tool',
        parameters: {},
        execute: jest.fn().mockResolvedValue(executeResult)
    }
}

function makeRegistry(tools: Record<string, ToolInterface> = {}) {
    return makeSimpleRegistry<ToolInterface>(tools)
}

describe('ToolNode', () => {
    it('has type "tool"', () => {
        expect(new ToolNode(makeRegistry()).type).toBe('tool')
    })

    it('is not a start node', () => {
        expect(new ToolNode(makeRegistry()).isStart).toBe(false)
    })

    it('isReady when args port is provided', () => {
        const node = new ToolNode(makeRegistry())
        expect(node.isReady(new Set(['args']))).toBe(true)
    })

    it('is not ready when args port is missing', () => {
        const node = new ToolNode(makeRegistry())
        expect(node.isReady(new Set())).toBe(false)
    })

    it('executes the tool from the registry and returns result', async () => {
        const tool = makeTool('computed-value')
        const node = new ToolNode(makeRegistry({ my_tool: tool }))
        const { result } = await runNode(node.execute({ args: { key: 'val' } }, { toolName: 'my_tool' }))
        expect(result.output['result']).toBe('computed-value')
    })

    it('passes args to tool.execute', async () => {
        const tool = makeTool()
        const node = new ToolNode(makeRegistry({ my_tool: tool }))
        await runNode(node.execute({ args: { x: 1, y: 2 } }, { toolName: 'my_tool' }))
        expect(tool.execute).toHaveBeenCalledWith({ x: 1, y: 2 }, 'tool', 'tool')
    })

    it('throws WorkFlowNodeError when tool is not found in registry', async () => {
        const node = new ToolNode(makeRegistry())
        await expect(runNode(node.execute({ args: {} }, { toolName: 'missing_tool' }))).rejects.toThrow(
            WorkFlowNodeError
        )
    })

    it('throws WorkFlowNodeError when toolName config is missing', async () => {
        const node = new ToolNode(makeRegistry({ my_tool: makeTool() }))
        await expect(runNode(node.execute({ args: {} }, {}))).rejects.toThrow()
    })

    it('emits no events', async () => {
        const tool = makeTool()
        const node = new ToolNode(makeRegistry({ my_tool: tool }))
        const { events } = await runNode(node.execute({ args: {} }, { toolName: 'my_tool' }))
        expect(events).toHaveLength(0)
    })
})
