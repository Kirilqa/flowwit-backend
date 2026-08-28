import { MessageContentPart } from './MessageContentPart'
import { MessageRole } from './MessageRole'

export type Message = {
    role: MessageRole
    content: string | Array<MessageContentPart>
    name?: string
}
