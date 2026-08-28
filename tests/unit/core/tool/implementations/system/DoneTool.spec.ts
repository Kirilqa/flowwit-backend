import { DoneTool } from '@tool/implementations/system/DoneTool'

describe('DoneTool', () => {
    it('has correct name', () => {
        expect(new DoneTool().name).toBe('done')
    })

    it('resolves with "done"', async () => {
        const result = await new DoneTool().execute({}, 'agent-1', 'session-1')
        expect(result).toBe('done')
    })
})
