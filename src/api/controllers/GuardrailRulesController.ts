import { FastifyReply, FastifyRequest } from 'fastify'
import { GuardrailRulesStoreInterface } from '@guardrail'
import { guardrailRuleParamsSchema, guardrailIdParamsSchema, guardrailRuleBodySchema } from '../validators'

export class GuardrailRulesController {
    constructor(private readonly rulesStore: GuardrailRulesStoreInterface) {}

    async getGlobalRules(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const params = guardrailIdParamsSchema.safeParse(request.params)

        if (!params.success) {
            await reply.status(400).send({ error: 'Invalid params' })
            return
        }

        const rules = this.rulesStore.getAllGlobalRules(params.data.guardrailId)

        await reply.status(200).send(rules)
    }

    async setGlobalRule(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const params = guardrailRuleParamsSchema.safeParse(request.params)

        if (!params.success) {
            await reply.status(400).send({ error: 'Invalid params' })
            return
        }

        const body = guardrailRuleBodySchema.safeParse(request.body)

        if (!body.success) {
            await reply.status(400).send({ error: 'Invalid body' })
            return
        }

        await this.rulesStore.setGlobalRule(params.data.guardrailId, params.data.ruleKey, body.data.decision)

        await reply.status(204).send()
    }

    async deleteGlobalRule(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const params = guardrailRuleParamsSchema.safeParse(request.params)

        if (!params.success) {
            await reply.status(400).send({ error: 'Invalid params' })
            return
        }

        await this.rulesStore.deleteGlobalRule(params.data.guardrailId, params.data.ruleKey)

        await reply.status(204).send()
    }
}
