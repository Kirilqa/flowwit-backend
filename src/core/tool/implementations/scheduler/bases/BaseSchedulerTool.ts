import { ZodObject, ZodRawShape } from 'zod'
import { BaseTool } from '../../bases/BaseTool'

export abstract class BaseSchedulerTool<TSchema extends ZodObject<ZodRawShape>> extends BaseTool<TSchema> {}
