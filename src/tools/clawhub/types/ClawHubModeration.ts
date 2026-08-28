export type ClawHubModeration = {
    isSuspicious: boolean
    isMalwareBlocked: boolean
    verdict: string
    reasonCodes: Array<string>
    summary: string | null
    engineVersion: string
    updatedAt: number
}
