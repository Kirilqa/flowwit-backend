import { createBrowserTools } from '@tool/implementations/browser/utils/createBrowserTools'

describe('createBrowserTools', () => {
    it('creates one tool instance for each browser tool', () => {
        const tools = createBrowserTools()
        expect(tools).toHaveLength(8)
    })

    it('includes all expected tool names exactly once', () => {
        const tools = createBrowserTools()
        const names = tools.map(t => t.name)
        expect(new Set(names).size).toBe(names.length)
        expect(names).toEqual(
            expect.arrayContaining([
                'browser_navigate',
                'browser_click',
                'browser_type',
                'browser_get_content',
                'browser_screenshot',
                'browser_scroll',
                'browser_wait',
                'browser_evaluate'
            ])
        )
    })
})
