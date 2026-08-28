import { ToolInterface } from '../../../interfaces'
import { BrowserClickTool } from '../BrowserClickTool'
import { BrowserEvaluateTool } from '../BrowserEvaluateTool'
import { BrowserGetContentTool } from '../BrowserGetContentTool'
import { BrowserManager } from '../BrowserManager'
import { BrowserNavigateTool } from '../BrowserNavigateTool'
import { BrowserScreenshotTool } from '../BrowserScreenshotTool'
import { BrowserScrollTool } from '../BrowserScrollTool'
import { BrowserTypeTool } from '../BrowserTypeTool'
import { BrowserWaitTool } from '../BrowserWaitTool'

export const createBrowserTools = (): Array<ToolInterface> => {
    const browserManager = new BrowserManager()

    return [
        new BrowserNavigateTool(browserManager),
        new BrowserClickTool(browserManager),
        new BrowserTypeTool(browserManager),
        new BrowserGetContentTool(browserManager),
        new BrowserScreenshotTool(browserManager),
        new BrowserScrollTool(browserManager),
        new BrowserWaitTool(browserManager),
        new BrowserEvaluateTool(browserManager)
    ]
}
