import { GUARDRAIL_ACTION, GuardrailAction } from './GuardrailAction'

export type GuardrailCheckBaseResult = {
    action: GuardrailAction
}

export type GuardrailCheckAllowResult = GuardrailCheckBaseResult & {
    action: typeof GUARDRAIL_ACTION.ALLOW
}

export type GuardrailCheckWarnResult = GuardrailCheckBaseResult & {
    action: typeof GUARDRAIL_ACTION.WARN
    reason: string
}

export type GuardrailCheckBlockResult = GuardrailCheckBaseResult & {
    action: typeof GUARDRAIL_ACTION.BLOCK
    reason: string
}

export type GuardrailCheckResult = GuardrailCheckAllowResult | GuardrailCheckWarnResult | GuardrailCheckBlockResult
