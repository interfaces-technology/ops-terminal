# Ops Terminal

ASCII ops dashboard for [The Interfaces Company](https://github.com/interfaces-technology). Syncs **Linear** (engineering) and **Notion** (NOW, Work Queue, Resume) into a local cache and renders progress as a terminal-style board.

```
╔══════════════════════════════════════════════════════════════════════════════╗
║ NOW · 3 slots                                                                ║
╠══════════════════════════════════════════════════════════════════════════════╣
║ [1] ▶ Error and loading states · Workbench                                   ║
║ [2] ○ Production PDF export layout · Workbench                               ║
║ [3] ◐ Deploy pipeline docs · Workbench                                       ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

## Stack

- Next.js 16 (App Router)
- Linear GraphQL API
- Notion REST API
- Upstash Redis cache on Vercel (local `.data/cache.json` fallback)

## Setup

```bash
cp .env.example .env.local
```

| Variable | Where to get it |
|----------|-----------------|
| `LINEAR_API_KEY` | Linear → Settings → API → Personal API keys |
| `NOTION_API_KEY` | [Notion integrations](https://www.notion.so/my-integrations) — share Work Queue, NOW, Resume, Projects DBs with the integration |

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Click **`[ sync ]`** to pull fresh data.

## Deploy to Vercel

1. Import the repo in [Vercel](https://vercel.com/new).
2. Add **Upstash Redis** from the Vercel Marketplace and link it to the project (sets `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`).
3. Add `LINEAR_API_KEY` and `NOTION_API_KEY` in project environment variables.
4. Deploy.

Without Redis env vars, the app falls back to the local file cache (works in dev, not on Vercel serverless).

## API

| Route | Method | Description |
|-------|--------|-------------|
| `/api/sync` | POST | Fetch Linear + Notion → write cache |
| `/api/state` | GET | Return cached snapshot (`?force=1` to sync first) |

## What it shows

- **NOW** — 3 slots from Notion
- **Active cycles** — Lab + Play cycle progress from Linear
- **Projects** — Linear project completion bars
- **Workbench V1** — open LAB issues
- **Work Queue** — top queued items from Notion
- **Resume** — per-product summaries from Notion

## Ops rules (respect PCR model)

- Read-only mirror — does not write to Notion NOW/Queue/Resume
- Does not bulk-sync Linear into Notion
- Database IDs match `Interfaces-Company/docs/notion.md`

## Repo

https://github.com/interfaces-technology/ops-terminal

Docs: [Interfaces-Company](https://github.com/interfaces-technology/Interfaces-Company) (`docs/workflow.md`, `docs/notion.md`)
