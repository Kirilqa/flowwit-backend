import { InitializableInterface, RepositoryInterface } from '@core/interfaces'
import { Skill, SkillSeed } from '../../types'
import { SkillResourceRepositoryInterface } from './SkillResourceRepositoryInterface'

export interface SkillRepositoryInterface
    extends RepositoryInterface<Skill>, SkillResourceRepositoryInterface, InitializableInterface<Array<SkillSeed>> {}
