export type MCPServerCapabilities = {
    version: string
    hasTools: boolean
    hasResources: boolean
    hasPrompts: boolean
    hasLogging: boolean
    toolsListChanged: boolean
    resourcesListChanged: boolean
    resourcesSubscribe: boolean
    promptsListChanged: boolean
}
