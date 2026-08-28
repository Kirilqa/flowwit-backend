import { MCPClientInterface } from '../interfaces'
import { MCPServerConfig } from './MCPServerConfig'

export type MCPClientFactory = (config: MCPServerConfig) => MCPClientInterface
