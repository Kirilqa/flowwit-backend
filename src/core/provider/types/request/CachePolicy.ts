export const CACHE_POLICY = {
    NONE: 'none',
    AUTO: 'auto',
    ENABLED: 'enabled'
} as const

export type CachePolicy = (typeof CACHE_POLICY)[keyof typeof CACHE_POLICY]
