import { ChannelInterface, ChannelConfig, CHANNEL_SETTING_VISIBILITY } from '@channel'
import { ChannelDetail, ChannelSettingDetail } from '../types'

export function buildChannelDetail(channel: ChannelInterface, config: ChannelConfig | null): ChannelDetail {
    const stored = config?.settings ?? {}
    const schema = channel.settingsSchema

    const settings: Array<ChannelSettingDetail> = schema.map(field => {
        const key = field.key
        const base = {
            key,
            label: field.label,
            type: field.type,
            required: field.required ?? false
        }

        if (field.visibility === CHANNEL_SETTING_VISIBILITY.PRIVATE) {
            return { ...base, visibility: 'private' as const, isSet: stored[key] !== undefined }
        }

        return { ...base, visibility: 'public' as const, value: stored[key] ?? null }
    })

    return { id: channel.id, settings }
}
