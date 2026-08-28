import { FastifyInstance } from 'fastify'
import { GuardrailRulesController } from '../controllers/GuardrailRulesController'

export function guardrailRulesRoutes(fastify: FastifyInstance, controller: GuardrailRulesController): void {
    fastify.get('/guardrails/rules/global/:guardrailId', controller.getGlobalRules.bind(controller))
    fastify.put('/guardrails/rules/global/:guardrailId/:ruleKey', controller.setGlobalRule.bind(controller))
    fastify.delete('/guardrails/rules/global/:guardrailId/:ruleKey', controller.deleteGlobalRule.bind(controller))
}
