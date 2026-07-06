# Ops Terminal

ASCII ops dashboard for [The Interfaces Company](https://github.com/interfaces-technology). **One unified snapshot** merging **Notion** (plan + today) and **Linear** (build + status).

```
╔══════════════════════════════════════════════════════════════════════════════╗
║ FOCUS · 3 slots                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║ [1] ▶ WOR-124 Settings page · Workbench  [In Progress]                       ║
║ [2] ▶ Play brand refresh · Play                                              ║
║ [3] ○ Company ops terminal · Company                                         ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

## Stack

- Next.js 16 (App Router)
- Linear GraphQL API (LAB · PLAY · WOR)
- Notion REST API (Focus page, Horizon, Projects, Ship Log)
- Upstash Redis cache on Vercel (local `.data/cache.json` fallback)

## Setup

```bash
cp .env.example .env.local
```

| Variable | Where to get it |
|----------|-----------------|
| `LINEAR_API_KEY` | Linear → Settings → API → Personal API keys |
| `NOTION_API_KEY` | [Notion Developer portal](https://www.notion.so/profile/integrations) → **Personal access tokens** → create token with **Notion API** capability |

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
| `/api/sync` | POST | Fetch Linear + Notion → write unified cache |
| `/api/state` | GET | Return cached snapshot (`?force=1` to sync first) |

## What it shows

- **Focus** — 3 daily slots from Notion Focus page (enriched with Linear issue state)
- **Horizon** — committed aims (Status: Now) with Linear initiative links
- **Active** — Notion projects (Phase: Active) + Linear project progress
- **Linear** — issue counts by team (LAB · PLAY · WOR)
- **Last session** — from Focus page
- **Ship Log** — recent ships from Notion

## Ops rules (Company OS)

- Read-only mirror — does not write to Notion or Linear
- Cross-reference only — never bulk-sync Linear issues into Notion
- Database IDs match `Interfaces-Company/docs/notion.md`
- Retired sources (NOW, Work Queue, Resume, Cycles) are not used

## Repo

https://github.com/interfaces-technology/ops-terminal

Docs: [Interfaces-Company](https://github.com/interfaces-technology/Interfaces-Company) (`docs/company-os.md`, `docs/notion.md`, `docs/linear.md`)
