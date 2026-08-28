import { ChannelResponseInterface } from '../interfaces/ChannelResponseInterface'
import { ChannelRequest } from './ChannelRequest'

export type ChannelMessageHandler = (request: ChannelRequest, response: ChannelResponseInterface) => Promise<void>
