import { ZodObject, ZodRawShape } from 'zod'
import { BaseTool } from '../../bases/BaseTool'

export abstract class BaseChannelTool<TSchema extends ZodObject<ZodRawShape>> extends BaseTool<TSchema> {}
