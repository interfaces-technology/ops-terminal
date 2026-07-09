# Ops Terminal

ASCII ops dashboard for [The Interfaces Company](https://github.com/interfaces-technology). **One unified snapshot** from **Notion** (Focus, Horizon, Projects, Milestones, Sprints, Ship Log).

```
╔══════════════════════════════════════════════════════════════════════════════╗
║ FOCUS · milestones & sprints                                                 ║
╠══════════════════════════════════════════════════════════════════════════════╣
║ [1] ▶ Settings page                                                          ║
║ [2] ▶ Play brand refresh                                                     ║
║ [3] ▶ Company ops terminal                                                   ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

## Stack

- Next.js 16 (App Router)
- Notion REST API (Focus page, Horizon, Projects, Milestones, Sprints, Ship Log)
- Upstash Redis cache on Vercel (local `.data/cache.json` fallback)

## Setup

```bash
cp .env.example .env.local
```

| Variable | Where to get it |
|----------|-----------------|
| `NOTION_API_KEY` | [Notion Developer portal](https://www.notion.so/profile/integrations) → **Personal access tokens** → create token with **Notion API** capability |

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Click **`[ sync ]`** to pull fresh data.

## Deploy to Vercel

1. Import the repo in [Vercel](https://vercel.com/new).
2. Add **Upstash Redis** from the Vercel Marketplace and link it to the project (sets `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`).
3. Add `NOTION_API_KEY` in project environment variables.
4. Deploy.

Without Redis env vars, the app falls back to the local file cache (works in dev, not on Vercel serverless).

## API

| Route | Method | Description |
|-------|--------|-------------|
| `/api/sync` | POST | Fetch Notion → write unified cache |
| `/api/state` | GET | Return cached snapshot (`?force=1` to sync first) |

## What it shows

- **Focus** — 3 slots from Notion milestones & sprints
- **Horizon** — committed aims (Status: Now)
- **Domains** — Notion projects grouped by Company · Lab · Play · Workbench
- **Ship Log** — recent ships from Notion

## Ops rules (Company OS)

- Read-only mirror — does not write to Notion
- Database IDs match `Interfaces-Company/docs/notion.md`
- Retired sources (Linear, NOW, Work Queue, Resume, Cycles) are not used

## Repo

https://github.com/interfaces-technology/ops-terminal

Docs: [Interfaces-Company](https://github.com/interfaces-technology/Interfaces-Company) (`docs/company-os.md`, `docs/notion.md`)
