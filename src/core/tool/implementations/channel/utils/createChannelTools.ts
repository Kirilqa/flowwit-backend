import { ToolInterface } from '../../../interfaces'
import { CreateChannelToolsDependencies } from '../types'
import { ListChannelsTool } from '../ListChannelsTool'
import { InfoChannelTool } from '../InfoChannelTool'
import { UpdateChannelTool } from '../UpdateChannelTool'

export function createChannelTools(dependencies: CreateChannelToolsDependencies): Array<ToolInterface> {
    return [
        new ListChannelsTool(dependencies.channelRegistry, dependencies.channelConfigRepository),
        new InfoChannelTool(dependencies.channelRegistry, dependencies.channelConfigRepository),
        new UpdateChannelTool(
            dependencies.channelRegistry,
            dependencies.channelConfigRepository,
            dependencies.channelConfigResolver
        )
    ]
}
