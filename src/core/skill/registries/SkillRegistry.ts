import { BaseRegistry } from '@core/bases'
import { SkillRegistryInterface } from '../interfaces'
import { Skill } from '../types'

export class SkillRegistry extends BaseRegistry<Skill> implements SkillRegistryInterface {}
