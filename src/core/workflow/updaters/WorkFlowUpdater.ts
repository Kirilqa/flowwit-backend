import { stableStringify } from '@core/utils'
import { WATCHER_EVENT_TYPE, WatcherEvent, WatcherEventUpdaterInterface } from '@watcher'
import { AgentRegistryInterface } from '@agent'
import { WorkFlowInterface } from '../interfaces/WorkFlowInterface'
import { WorkFlowRegistryInterface } from '../interfaces/registries/WorkFlowRegistryInterface'
import { WorkFlowRepositoryInterface } from '../interfaces/repositories/WorkFlowRepositoryInterface'

export class WorkFlowUpdater implements WatcherEventUpdaterInterface {
    private readonly fingerprints = new Map<string, string>()

    constructor(
        private readonly workflowRepository: WorkFlowRepositoryInterface,
        private readonly workflowRegistry: WorkFlowRegistryInterface,
        private readonly agentRegistry: AgentRegistryInterface
    ) {}

    async handle(event: WatcherEvent): Promise<void> {
        if (event.type === WATCHER_EVENT_TYPE.ADD || event.type === WATCHER_EVENT_TYPE.CHANGE) {
            await this.handleUpsert()
        } else {
            await this.handleUnlink()
        }
    }

    private async handleUpsert(): Promise<void> {
        const workflows = await this.workflowRepository.findAll()
        const workflowIds = new Set(workflows.map(workflow => workflow.id))
        const changedIds = new Set<string>()

        for (const workflow of workflows) {
            const fingerprint = this.buildFingerprint(workflow)

            if (this.fingerprints.get(workflow.id) === fingerprint) {
                continue
            }

            if (this.workflowRegistry.has(workflow.id)) {
                this.workflowRegistry.unregister(workflow.id)
            }

            this.workflowRegistry.register(workflow.id, workflow)
            this.fingerprints.set(workflow.id, fingerprint)
            changedIds.add(workflow.id)
        }

        for (const workflow of this.workflowRegistry.list()) {
            if (!workflowIds.has(workflow.id)) {
                this.workflowRegistry.unregister(workflow.id)
                this.fingerprints.delete(workflow.id)
                changedIds.add(workflow.id)
            }
        }

        if (changedIds.size === 0) {
            return
        }

        for (const agent of this.agentRegistry.list()) {
            const agentWorkflows = agent.config.workflows ?? []

            if (!agentWorkflows.some(workflow => changedIds.has(workflow.id))) {
                continue
            }

            const updatedWorkflows = agentWorkflows
                .filter(workflow => workflowIds.has(workflow.id))
                .map(workflow => this.workflowRegistry.get(workflow.id) ?? workflow)

            agent.update({ workflows: updatedWorkflows })
        }
    }

    private async handleUnlink(): Promise<void> {
        for (const workflow of this.workflowRegistry.list()) {
            this.workflowRegistry.unregister(workflow.id)
            this.fingerprints.delete(workflow.id)
        }

        for (const agent of this.agentRegistry.list()) {
            if ((agent.config.workflows ?? []).length === 0) {
                continue
            }

            agent.update({ workflows: [] })
        }
    }

    private buildFingerprint(workflow: WorkFlowInterface): string {
        return stableStringify({
            id: workflow.id,
            name: workflow.name,
            description: workflow.description,
            entries: workflow.getEntries().map(e => ({
                id: e.id,
                nodeType: e.node.type,
                portMappings: e.portMappings,
                configOverrides: e.configOverrides
            })),
            connections: workflow.getConnections()
        })
    }
}
