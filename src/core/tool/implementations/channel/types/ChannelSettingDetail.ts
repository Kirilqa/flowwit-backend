import { ChannelSettingType } from '@channel'

type ChannelSettingDetailBase = {
    key: string
    label: string
    type: ChannelSettingType
    required: boolean
}

export type ChannelSettingDetail =
    | (ChannelSettingDetailBase & { visibility: 'public'; value: string | boolean | number | null })
    | (ChannelSettingDetailBase & { visibility: 'private'; isSet: boolean })
