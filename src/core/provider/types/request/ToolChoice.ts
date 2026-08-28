export type ToolChoice =
    { type: 'none' } | { type: 'auto' } | { type: 'required' } | { type: 'function'; function: { name: string } }
