export const MODEL_FAMILY = {
    GPT: 'gpt',
    CLAUDE: 'claude',
    GEMINI: 'gemini',
    LLAMA: 'llama',
    MISTRAL: 'mistral',
    QWEN: 'qwen',
    DEEPSEEK: 'deepseek',
    MINIMAX: 'minimax',
    KIMI: 'kimi',
    MIMO: 'mimo',
    OPENROUTER: 'openrouter',
    CUSTOM: 'custom'
} as const

export type ModelFamily = (typeof MODEL_FAMILY)[keyof typeof MODEL_FAMILY]
