export type MCPToolTextContent = {
    type: 'text'
    text: string
}

export type MCPToolImageContent = {
    type: 'image'
    data: string
    mimeType: string
}

export type MCPToolAudioContent = {
    type: 'audio'
    data: string
    mimeType: string
}

export type MCPToolResourceContent = {
    type: 'resource'
    uri: string
    mimeType?: string
    text?: string
    blob?: string
}

export type MCPToolResourceLinkContent = {
    type: 'resource_link'
    uri: string
    name: string
    mimeType?: string
    description?: string
}

export type MCPCallToolResultContent =
    MCPToolTextContent | MCPToolImageContent | MCPToolAudioContent | MCPToolResourceContent | MCPToolResourceLinkContent
