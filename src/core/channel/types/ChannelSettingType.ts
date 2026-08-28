export const CHANNEL_SETTING_TYPE = {
    STRING: 'string',
    BOOLEAN: 'boolean',
    NUMBER: 'number'
} as const

export type ChannelSettingType = (typeof CHANNEL_SETTING_TYPE)[keyof typeof CHANNEL_SETTING_TYPE]
