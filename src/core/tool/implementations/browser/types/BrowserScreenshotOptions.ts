export type BrowserScreenshotOptions = {
    fullPage?: boolean
    clip?: {
        x: number
        y: number
        width: number
        height: number
    }
    format?: 'png' | 'jpeg'
    quality?: number
    omitBackground?: boolean
    scale?: 'css' | 'device'
}
