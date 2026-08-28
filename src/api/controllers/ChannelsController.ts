import { FastifyReply, FastifyRequest } from 'fastify'
import {
    ChannelRegistryInterface,
    ChannelConfigRepositoryInterface,
    ChannelConfigResolver,
    CHANNEL_SETTING_VISIBILITY
} from '@channel'
import { channelParamsSchema, updateSettingsBodySchema } from '../validators'

export class ChannelsController {
    private readonly resolver = new ChannelConfigResolver()

    constructor(
        private readonly channelRegistry: ChannelRegistryInterface,
        private readonly channelConfigRepository: ChannelConfigRepositoryInterface
    ) {}

    async listChannels(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const channels = this.channelRegistry.list().map(channel => ({
            id: channel.id,
            schema: channel.settingsSchema
        }))

        await reply.status(200).send(channels)
    }

    async getChannelSettings(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const params = channelParamsSchema.safeParse(request.params)

        if (!params.success) {
            await reply.status(400).send({ error: 'Invalid params' })
            return
        }

        const channel = this.channelRegistry.get(params.data.id)

        if (channel === null) {
            await reply.status(404).send({ error: `Channel "${params.data.id}" not found` })
            return
        }

        const config = await this.channelConfigRepository.findById(params.data.id)
        const schema = channel.settingsSchema
        const resolved = this.resolver.resolve(config, schema)

        const settings = schema.map(field => {
            const key = field.key

            if (field.visibility === CHANNEL_SETTING_VISIBILITY.PRIVATE) {
                return {
                    key,
                    label: field.label,
                    type: field.type,
                    visibility: field.visibility,
                    isSet: Boolean(resolved[key])
                }
            }

            return { key, label: field.label, type: field.type, visibility: field.visibility, value: resolved[key] }
        })

        await reply.status(200).send({ id: channel.id, settings })
    }

    async updateChannelSettings(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const params = channelParamsSchema.safeParse(request.params)

        if (!params.success) {
            await reply.status(400).send({ error: 'Invalid params' })
            return
        }

        const channel = this.channelRegistry.get(params.data.id)

        if (channel === null) {
            await reply.status(404).send({ error: `Channel "${params.data.id}" not found` })
            return
        }

        const body = updateSettingsBodySchema.safeParse(request.body)

        if (!body.success) {
            await reply.status(400).send({ error: 'Invalid body' })
            return
        }

        const schema = channel.settingsSchema
        const validKeys = new Set(schema.map(field => field.key))
        const filteredSettings: Record<string, string | boolean | number> = {}

        for (const [key, value] of Object.entries(body.data)) {
            if (validKeys.has(key)) {
                filteredSettings[key] = value
            }
        }

        const existing = await this.channelConfigRepository.findById(params.data.id)

        if (existing !== null) {
            await this.channelConfigRepository.update(params.data.id, { settings: filteredSettings })
        } else {
            await this.channelConfigRepository.create({ channelId: params.data.id, settings: filteredSettings })
        }

        const config = await this.channelConfigRepository.findById(params.data.id)
        const resolved = this.resolver.resolve(config, schema)
        channel.configure(resolved)

        await reply.status(200).send({ id: channel.id, settings: filteredSettings })
    }
}
