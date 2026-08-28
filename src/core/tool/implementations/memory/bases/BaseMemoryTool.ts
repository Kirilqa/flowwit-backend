import { ZodObject, ZodRawShape } from 'zod'
import { BaseTool } from '../../bases/BaseTool'

export abstract class BaseMemoryTool<TSchema extends ZodObject<ZodRawShape>> extends BaseTool<TSchema> {}
