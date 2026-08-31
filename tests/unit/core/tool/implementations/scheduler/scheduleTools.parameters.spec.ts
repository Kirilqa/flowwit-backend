import { CreateScheduleTool } from '@tool/implementations/scheduler/CreateScheduleTool'
import { UpdateScheduleTool } from '@tool/implementations/scheduler/UpdateScheduleTool'

const fakeDependency = {} as never

describe('CreateScheduleTool / UpdateScheduleTool .parameters', () => {
    it('CreateScheduleTool.parameters does not throw and returns a valid JSON Schema', () => {
        const tool = new CreateScheduleTool(
            fakeDependency,
            fakeDependency,
            fakeDependency,
            fakeDependency,
            fakeDependency
        )

        expect(() => tool.parameters).not.toThrow()
        expect(tool.parameters['properties']).toMatchObject({
            schedule: expect.anything(),
            execution: expect.anything(),
            destination: expect.anything()
        })
    })

    it('UpdateScheduleTool.parameters does not throw and returns a valid JSON Schema', () => {
        const tool = new UpdateScheduleTool(
            fakeDependency,
            fakeDependency,
            fakeDependency,
            fakeDependency,
            fakeDependency
        )

        expect(() => tool.parameters).not.toThrow()
        expect(tool.parameters['properties']).toMatchObject({
            taskId: expect.anything(),
            schedule: expect.anything(),
            execution: expect.anything(),
            destination: expect.anything()
        })
    })
})
