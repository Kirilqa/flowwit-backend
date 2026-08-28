export type ShellToolOptions = {
    cwd?: string
    allowedCommands?: Array<string>
    blockedCommands?: Array<string>
    timeoutMs?: number
}
