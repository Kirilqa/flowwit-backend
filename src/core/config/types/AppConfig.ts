import { OpenAIConfig } from './OpenAIConfig'
import { OpenRouterConfig } from './OpenRouterConfig'
import { OllamaConfig } from './OllamaConfig'
import { LMStudioConfig } from './LMStudioConfig'
import { ServerConfig } from './ServerConfig'
import { PathsConfig } from './PathsConfig'
import { MemoryConfig } from './MemoryConfig'

export type AppConfig = {
    openai: OpenAIConfig
    openrouter: OpenRouterConfig
    ollama: OllamaConfig
    lmstudio: LMStudioConfig
    server: ServerConfig
    paths: PathsConfig
    memory: MemoryConfig
    userTimezone?: string
}
