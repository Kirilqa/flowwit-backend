import { BudgetConfig } from './BudgetConfig'
import { BudgetInterface } from '../interfaces'

export type BudgetFactory = (config: BudgetConfig) => BudgetInterface
