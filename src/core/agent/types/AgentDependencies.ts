import { GuardrailInterface, GuardrailResolverInterface } from '@guardrail'
import { MemoryInterface } from '@memory'
import { ObservabilityInterface } from '@observability'
import { BudgetFactory } from '../budget'
import { ToolOrchestratorInterface } from '../toolOrchestrator'
import { StructuredOutputExtractorInterface } from '../structured'

export type AgentDependencies = {
    toolOrchestrator: ToolOrchestratorInterface
    guardrails: Array<GuardrailInterface>
    guardrailResolver: GuardrailResolverInterface
    observability: ObservabilityInterface
    structuredOutputExtractor: StructuredOutputExtractorInterface
    memory: MemoryInterface
    budgetFactory: BudgetFactory
}
