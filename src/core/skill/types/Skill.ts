export type Skill = {
    name: string
    description: string
    content: string
    directory: string
    resources: Array<string>
    license?: string
    compatibility?: string
    allowedTools?: Array<string>
    metadata?: Record<string, unknown>
}
