import { RUN_MODE, RunMode } from '../types'

export function parseRunMode(): RunMode {
    const args = process.argv.slice(2)

    if (args.includes('--server')) return RUN_MODE.SERVER
    if (args.includes('--chat')) return RUN_MODE.CHAT

    return RUN_MODE.SERVER
}
