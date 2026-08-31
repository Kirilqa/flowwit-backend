# Flowwit

[Русская версия](README.ru.md)

A multi-agent LLM platform with a visual workflow engine. Chat with agents directly, or build deterministic pipelines (node graphs) that agents execute step by step — instead of relying on an LLM's judgment every single time about what to do next.

This is the platform's backend. There's a separate frontend with a visual workflow editor — it's optional, you can work without it too, for example through the Telegram channel.

## Installation

```bash
git clone https://github.com/Kirilqa/flowwit-backend
cd flowwit-backend
npm install
```

## Setup

Copy the example environment file and configure at least one provider:

```bash
cp .env.example .env
```

```env
OPENAI_API_KEY=sk-...
# or
OPENROUTER_API_KEY=sk-or-...
# or, for local models via Ollama, no key needed:
OLLAMA_BASE_URL=http://localhost:11434
# or, for local models via LM Studio, key only needed if you enabled it there:
LMSTUDIO_BASE_URL=http://localhost:1234
```

At least one provider must be configured — OpenAI/OpenRouter need their API key set, Ollama/LM Studio just need their `*_BASE_URL` explicitly uncommented (both are only attempted at startup when their variable is present). LM Studio's API key is optional — set `LMSTUDIO_API_KEY` only if you've turned on "Require Authentication" in LM Studio's own server settings. Everything else in `.env.example` (server port/host, storage paths, extra provider options, channel settings) is optional, with sensible defaults.

All persistent data (agent/MCP/channel configs, sessions, skills, memory, workflows, scheduled tasks) lives under `./data/` by default — back up or volume-mount that one folder to persist everything. On first run (empty `./data/`), the server creates a starter agent and installs five system skill guides on its own — nothing to set up by hand.

## Running

```bash
npm run dev             # API server on http://localhost:3000 (or SERVER_PORT), with hot reload of configs
npm run dev -- --chat   # console chat instead of the server
```

For a production build:

```bash
npm run build
npm run start
```

Or with Docker:

```bash
docker build -t flowwit-backend .
docker run --env-file .env -p 3000:3000 -v $(pwd)/data:/app/data flowwit-backend
```

The `-v` mount is what makes data survive a container recreation (e.g. on the next `docker run` after an update) — without it, everything under `./data/` lives only in the container's writable layer and is lost the moment the container is removed.

If you're using `OLLAMA_BASE_URL`/`LMSTUDIO_BASE_URL` and running the backend itself in Docker, `localhost` inside the container is the container, not your host machine — point it at `http://host.docker.internal:11434`/`http://host.docker.internal:1234` instead (Docker Desktop on Mac/Windows) or the host's real LAN IP (Linux).

## Usage

- **Server mode** (default) — REST + SSE API for chat, workflows, agents, the scheduler and everything else. The generation SSE stream is `POST /messages`.
- **Console mode** (`--chat`) — talk to the agent right in the terminal.
- Agents, MCP servers, channels, workflows and scheduled tasks are described declaratively in JSON files (`./data/agents.json`, `./data/mcp.json`, `./data/channels.json`, `./data/workflows/`, `./data/scheduled-tasks.json` by default — paths are configurable, see `.env.example`) and picked up live, without restarting the process.

## What's inside

- **Agents** — LLM agents with tool calling, two thinking strategies (freeform ReAct and explicit Plan-and-Execute), skills, sub-agents, MCP servers, budgets, guardrails with interactive confirmation, persistent sessions.
- **Skills** — file-based `SKILL.md` with instructions, scripts (executed, not read as code) and binary assets; the ClawHub marketplace for installing/updating third-party skills.
- **WorkFlow** — the backend for the graph editor: typed ports, parallel branches, loops, streaming of execution events.
- **Scheduler** — runs an agent prompt or a workflow once, on a cron schedule, or on demand.
- **Channels** — Web (SSE) and Console out of the box, Telegram as the first user channel; each has its own settings and hot reload.
- **Guardrails** — interactive allow/deny of tool calls, with rules at three levels (global/agent/session) and glob patterns.
- **Memory** — file-based persistent agent memory across sessions, with configurable size limits.

## Stack

Node.js, TypeScript (strict), Zod, Fastify, Server-Sent Events, Pino.

## Development

```bash
npm run lint            # eslint
npm run check-format    # prettier --check
npm test                # jest
npm run test:coverage   # jest --coverage
```

## License

[MIT](LICENSE)
