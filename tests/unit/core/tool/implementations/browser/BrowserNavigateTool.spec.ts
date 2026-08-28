import { BrowserNavigateTool } from '@tool/implementations/browser/BrowserNavigateTool'
import { makeBrowserManager, makePageMock, makeResponseMock } from '../../../../../helpers/makeBrowser'

describe('BrowserNavigateTool', () => {
    it('has correct name', () => {
        expect(new BrowserNavigateTool(makeBrowserManager()).name).toBe('browser_navigate')
    })

    it('navigates to the given URL', async () => {
        const page = makePageMock()
        const tool = new BrowserNavigateTool(makeBrowserManager(page))

        await tool.execute({ url: 'https://example.com' }, 'agent-1', 'session-1')

        expect(page.goto).toHaveBeenCalledWith('https://example.com', {})
    })

    it('passes waitUntil option when provided', async () => {
        const page = makePageMock()
        const tool = new BrowserNavigateTool(makeBrowserManager(page))

        await tool.execute({ url: 'https://example.com', waitUntil: 'networkidle' }, 'agent-1', 'session-1')

        expect(page.goto).toHaveBeenCalledWith('https://example.com', { waitUntil: 'networkidle' })
    })

    it('returns url, status and statusText from the response', async () => {
        const page = makePageMock({ goto: jest.fn().mockResolvedValue(makeResponseMock(201, 'Created')) })
        page.url.mockReturnValue('https://example.com/landed')
        const tool = new BrowserNavigateTool(makeBrowserManager(page))

        const result = (await tool.execute({ url: 'https://example.com' }, 'agent-1', 'session-1')) as {
            url: string
            status: number | null
            statusText: string | null
        }

        expect(result).toEqual({ url: 'https://example.com/landed', status: 201, statusText: 'Created' })
    })

    it('returns null status and statusText when response is null', async () => {
        const page = makePageMock({ goto: jest.fn().mockResolvedValue(null) })
        const tool = new BrowserNavigateTool(makeBrowserManager(page))

        const result = (await tool.execute({ url: 'https://example.com' }, 'agent-1', 'session-1')) as {
            status: number | null
            statusText: string | null
        }

        expect(result.status).toBeNull()
        expect(result.statusText).toBeNull()
    })
})
