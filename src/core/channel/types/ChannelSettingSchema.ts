import { ChannelSettingType } from './ChannelSettingType'
import { ChannelSettingVisibility } from './ChannelSettingVisibility'
import { ChannelSettings } from './ChannelSettings'

export type ChannelSettingSchema<TSettings extends ChannelSettings> = {
    [K in keyof TSettings]: {
        key: K
        label: string
        type: ChannelSettingType
        visibility: ChannelSettingVisibility
        envKey?: string
        required?: boolean
    }
}[keyof TSettings]
