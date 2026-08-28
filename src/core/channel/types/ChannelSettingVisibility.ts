export const CHANNEL_SETTING_VISIBILITY = {
    PUBLIC: 'public',
    PRIVATE: 'private'
} as const

export type ChannelSettingVisibility = (typeof CHANNEL_SETTING_VISIBILITY)[keyof typeof CHANNEL_SETTING_VISIBILITY]
