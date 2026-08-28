export type HttpToolOptions = {
    allowedHosts?: Array<string>
    blockedHosts?: Array<string>
    timeoutMs?: number
    defaultHeaders?: Record<string, string>
}
