export type MCPResourceTextContent = {
    uri: string
    mimeType?: string
    text: string
}

export type MCPResourceBlobContent = {
    uri: string
    mimeType?: string
    blob: string
}

export type MCPResourceContent = MCPResourceTextContent | MCPResourceBlobContent
