export const MODEL_FEATURE = {
    STREAMING: 'streaming',
    TOOLS: 'tools',
    VISION: 'vision',
    AUDIO: 'audio',
    VIDEO: 'video',
    JSON_MODE: 'json_mode',
    JSON_SCHEMA: 'json_schema',
    STRICT_SCHEMA: 'strict_schema',
    PARALLEL_TOOL_CALLS: 'parallel_tool_calls',
    MULTIPLE_CHOICES: 'multiple_choices',
    REASONING: 'reasoning',
    LOGPROBS: 'logprobs',
    SEED: 'seed',
    CACHING: 'caching'
} as const

export type ModelFeature = (typeof MODEL_FEATURE)[keyof typeof MODEL_FEATURE]
