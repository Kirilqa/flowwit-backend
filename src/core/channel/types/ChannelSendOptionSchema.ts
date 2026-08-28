import { ChannelSettingType } from './ChannelSettingType'

export type ChannelSendOptionSchema<TOptions> = {
    [K in keyof TOptions]: {
        key: K
        label: string
        type: ChannelSettingType
        required?: boolean
    }
}[keyof TOptions]
