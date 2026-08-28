import { ClawHubOwner } from './ClawHubOwner'

export type ClawHubSearchResult = {
    score: number
    slug: string
    displayName: string
    summary: string
    version: string
    updatedAt: number
    ownerHandle: string
    owner: ClawHubOwner
}
