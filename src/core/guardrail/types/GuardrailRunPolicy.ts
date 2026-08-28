import { GuardrailCheckMode } from './GuardrailCheckMode'

export type GuardrailRunPolicy = {
    input?: GuardrailCheckMode
    output?: GuardrailCheckMode
    toolCall?: GuardrailCheckMode
}
