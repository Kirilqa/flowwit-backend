export interface HumanInputResolverInterface {
    respond(sessionId: string, answer: string): void
    isWaiting(sessionId: string): boolean
}
