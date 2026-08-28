export type TelegramChatState = {
    chatId: number
    sessionId: string | null
    agentId: string | null
    sessionIds: Array<string>
}
