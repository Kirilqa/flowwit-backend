import vm from 'vm'
import { MappingValue } from '../types/MappingValue'

export const evaluateMappingValue = (
    value: MappingValue,
    portData: Record<string, unknown>,
    portInput?: unknown
): unknown => {
    if (value.type === 'constant') {
        return value.data
    }

    if (value.type === 'function') {
        return value.fn(portInput, portData)
    }

    const context = vm.createContext({ $ports: portData, $input: portInput })
    return vm.runInContext(value.expression, context, { timeout: 1000 })
}
