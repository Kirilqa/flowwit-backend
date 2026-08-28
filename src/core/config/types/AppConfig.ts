import { OpenAIConfig } from './OpenAIConfig'
import { OpenRouterConfig } from './OpenRouterConfig'
import { ServerConfig } from './ServerConfig'
import { PathsConfig } from './PathsConfig'
import { MemoryConfig } from './MemoryConfig'

export type AppConfig = {
    openai: OpenAIConfig
    openrouter: OpenRouterConfig
    server: ServerConfig
    paths: PathsConfig
    memory: MemoryConfig
    userTimezone?: string
}
