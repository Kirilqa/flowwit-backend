import { ChannelSettings } from '../types/ChannelSettings'
import { ChannelSettingSchema } from '../types/ChannelSettingSchema'
import { ChannelConfig } from '../types/ChannelConfig'

export class ChannelConfigResolver {
    resolve<TSettings extends ChannelSettings>(
        config: ChannelConfig | null,
        schema: Array<ChannelSettingSchema<TSettings>>
    ): TSettings {
        const base = (config?.settings ?? {}) as TSettings
        const resolved = { ...base } as Record<string, string | boolean | number>

        for (const field of schema) {
            const envKey = field.envKey
            if (envKey === undefined) continue

            const envValue = process.env[envKey]
            if (envValue === undefined) continue

            const key = String(field.key)

            if (field.type === 'boolean') {
                resolved[key] = envValue === 'true' || envValue === '1'
            } else if (field.type === 'number') {
                const parsed = Number(envValue)
                if (!isNaN(parsed)) resolved[key] = parsed
            } else {
                resolved[key] = envValue
            }
        }

        return resolved as TSettings
    }
}
