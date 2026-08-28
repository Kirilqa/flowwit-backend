import { GenerationResult, GenerationSpecification, ModelInfo, ProviderCapabilities, StreamChunk } from '../types'

export interface ProviderInterface {
    readonly name: string
    initialize(): Promise<void>
    listModels(): Promise<Array<ModelInfo>>
    getModelInfo(model: string): Promise<ModelInfo | null>
    getCapabilities(model: string): Promise<ProviderCapabilities>
    generate(specification: GenerationSpecification): Promise<GenerationResult>
    generateStream(specification: GenerationSpecification): AsyncIterable<StreamChunk>
    verifyAccess(): Promise<boolean>
}
