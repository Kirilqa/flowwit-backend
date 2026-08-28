import {
    ClawHubSkill,
    ClawHubSkillResponse,
    ClawHubSearchResponse,
    ClawHubSearchResult,
    ClawHubSkillVersion,
    ClawHubVersionsResponse,
    ClawHubScan
} from './types'

const BASE_URL = 'https://clawhub.ai'

export class ClawHubClient {
    async search(query: string, limit?: number): Promise<Array<ClawHubSearchResult>> {
        const params: Record<string, string> = {
            q: query,
            nonSuspiciousOnly: 'true',
            ...(limit !== undefined && { limit: String(limit) })
        }

        const data = await this.fetch<ClawHubSearchResponse>('/api/v1/search', params)

        return data.results
    }

    async getSkill(slug: string): Promise<ClawHubSkill> {
        const data = await this.fetch<ClawHubSkillResponse>(`/api/v1/skills/${slug}`)

        return {
            ...data.skill,
            latestVersion: data.latestVersion,
            metadata: data.metadata,
            owner: data.owner,
            moderation: data.moderation
        }
    }

    async getSkillVersions(slug: string, limit?: number): Promise<Array<ClawHubSkillVersion>> {
        const params: Record<string, string> = {
            ...(limit !== undefined && { limit: String(limit) })
        }

        const data = await this.fetch<ClawHubVersionsResponse>(`/api/v1/skills/${slug}/versions`, params)

        return data.items
    }

    async getSkillScan(slug: string, version?: string): Promise<ClawHubScan> {
        const params: Record<string, string> = {
            ...(version !== undefined && { version })
        }

        return this.fetch<ClawHubScan>(`/api/v1/skills/${slug}/scan`, params)
    }

    async download(slug: string, version?: string): Promise<Buffer> {
        const url = new URL(`${BASE_URL}/api/v1/download`)

        url.searchParams.set('slug', slug)

        if (version !== undefined) {
            url.searchParams.set('version', version)
        }

        const response = await fetch(url.toString())

        if (!response.ok) {
            const text = await response.text()
            throw new Error(`ClawHub download error ${response.status}: ${text}`)
        }

        const arrayBuffer = await response.arrayBuffer()

        return Buffer.from(arrayBuffer)
    }

    private async fetch<T>(path: string, params?: Record<string, string>): Promise<T> {
        const url = new URL(`${BASE_URL}${path}`)

        if (params) {
            for (const [key, value] of Object.entries(params)) {
                url.searchParams.set(key, value)
            }
        }

        const response = await fetch(url.toString(), {
            headers: { Accept: 'application/json' }
        })

        if (!response.ok) {
            const text = await response.text()
            throw new Error(`ClawHub API error ${response.status}: ${text}`)
        }

        return response.json() as Promise<T>
    }
}
