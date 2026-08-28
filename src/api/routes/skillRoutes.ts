import { FastifyInstance } from 'fastify'
import { SkillsController } from '../controllers/SkillsController'

export function skillRoutes(fastify: FastifyInstance, controller: SkillsController): void {
    fastify.addContentTypeParser(
        ['application/zip', 'application/octet-stream'],
        { parseAs: 'buffer' },
        (_req, body, done) => {
            done(null, body)
        }
    )

    fastify.get('/skills', (request, reply) => controller.listSkills(request, reply))
    fastify.get('/skills/:name', (request, reply) => controller.getSkill(request, reply))
    fastify.delete('/skills/:name', (request, reply) => controller.deleteSkill(request, reply))
    fastify.post('/skills/inspect', (request, reply) => controller.inspectSkill(request, reply))
    fastify.post('/skills/install', (request, reply) => controller.installSkill(request, reply))
}
