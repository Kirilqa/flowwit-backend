import { ToolInterface } from '../../../interfaces'
import { CreateSchedulerToolsDependencies } from '../types'
import { CreateScheduleTool } from '../CreateScheduleTool'
import { UpdateScheduleTool } from '../UpdateScheduleTool'
import { DeleteScheduleTool } from '../DeleteScheduleTool'
import { ListSchedulesTool } from '../ListSchedulesTool'
import { InfoScheduleTool } from '../InfoScheduleTool'
import { PauseScheduleTool } from '../PauseScheduleTool'
import { ResumeScheduleTool } from '../ResumeScheduleTool'
import { RunScheduleNowTool } from '../RunScheduleNowTool'
import { ListScheduleRunsTool } from '../ListScheduleRunsTool'
import { InfoScheduleRunTool } from '../InfoScheduleRunTool'

export function createSchedulerTools(dependencies: CreateSchedulerToolsDependencies): Array<ToolInterface> {
    return [
        new CreateScheduleTool(
            dependencies.scheduledTaskRepository,
            dependencies.scheduledTaskRegistry,
            dependencies.agentRegistry,
            dependencies.workflowRegistry,
            dependencies.skillRegistry
        ),
        new UpdateScheduleTool(
            dependencies.scheduledTaskRepository,
            dependencies.scheduledTaskRegistry,
            dependencies.agentRegistry,
            dependencies.workflowRegistry,
            dependencies.skillRegistry
        ),
        new DeleteScheduleTool(
            dependencies.scheduledTaskRepository,
            dependencies.scheduledTaskRegistry,
            dependencies.scheduledTaskRunRepository,
            dependencies.sessionManager
        ),
        new ListSchedulesTool(dependencies.scheduledTaskRegistry),
        new InfoScheduleTool(dependencies.scheduledTaskRegistry),
        new PauseScheduleTool(dependencies.scheduledTaskRepository, dependencies.scheduledTaskRegistry),
        new ResumeScheduleTool(dependencies.scheduledTaskRepository, dependencies.scheduledTaskRegistry),
        new RunScheduleNowTool(dependencies.scheduler, dependencies.scheduledTaskRegistry),
        new ListScheduleRunsTool(dependencies.scheduledTaskRunRepository),
        new InfoScheduleRunTool(dependencies.scheduledTaskRunRepository)
    ]
}
