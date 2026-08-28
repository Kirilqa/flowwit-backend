import { PlanStep } from '../types'

export function formatStep(step: PlanStep, depth: number): string {
    const indent = '  '.repeat(depth)
    const line = `${indent}- [${step.status}] ${step.id} ${step.description}`

    if (step.steps === undefined) {
        return line
    }

    const childLines = step.steps.map(child => formatStep(child, depth + 1))

    return [line, ...childLines].join('\n')
}
