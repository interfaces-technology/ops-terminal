# Ops Terminal

ASCII company snapshot for [The Interfaces Company](https://github.com/interfaces-technology). **Read-only mirror** of Notion — your daily surface instead of the Focus page.

## How the loop works

| Step | Owner | Role |
|------|--------|------|
| **1. Own the work** | Notion | Source of truth for tasks, projects, status, and agent prompts |
| **2. Execute** | Cursor | Agents pick up Notion tasks and open PRs |
| **3. Report** | GitHub | PR state syncs back to Notion (Actions secrets only — not app runtime) |
| **4. Render** | Ops Terminal | Read-only view of Notion — does not write, does not call GitHub |

```
Notion (work) → Cursor (execute) → GitHub (report) → Notion → Ops Terminal (render)
```

```
╔══════════════════════════════════════════════════════════════════════════════╗
║ TODAY · in progress                                                          ║
╠══════════════════════════════════════════════════════════════════════════════╣
║ [Company · Creative] Draft Interfaces visual principles v0                     ║
║ [Play · Code] Agent: Review agent Play audit                                 ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

## What it shows

| Section | Source |
|---------|--------|
| **TODAY** | In-progress Tasks across all teamspaces |
| **HORIZON** | Status: Now + related Milestones |
| **DOMAINS** | Company · Studio · Lab · Play · Workbench — Active projects + open task counts |
| **SHIP LOG** | Recent ships from Notion |

Notion stays the editor (Tasks, Projects, Ship Log). The terminal is the view.

## Stack

- Next.js 16 (App Router)
- Notion REST API (Horizon, Milestones, Projects, Tasks × 5 spaces, Ship Log)
- Upstash Redis cache on Vercel (local `.data/cache.json` fallback)

## Setup

```bash
cp .env.example .env.local
```

App runtime envs (only these two):

| Variable | Required | Where to get it |
|----------|----------|-----------------|
| `NOTION_API_KEY` | Yes | [Notion Developer portal](https://www.notion.so/profile/integrations) → **Personal access tokens** → create token with **Notion API** capability |
| `ACCESS_PASSWORD` | Optional | Shared password to gate the dashboard (set in Vercel / `.env.local`) |

Optional infra (not GitHub): `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` via Vercel Marketplace Upstash Redis. Locally, unset Redis falls back to `.data/cache.json`.

Do **not** add Linear or GitHub tokens to the app runtime. GitHub → Notion sync uses Action secrets in GitHub only.

### GitHub Action: PR → Notion sync

Workflow [`.github/workflows/sync-pr-to-notion.yml`](.github/workflows/sync-pr-to-notion.yml) runs on PR `opened` / `edited` / `synchronize` / `ready_for_review` / `closed` and patches linked Notion tasks (script: [`scripts/sync-pr-to-notion.mjs`](scripts/sync-pr-to-notion.mjs)).

Configure **one** repository secret (Actions → Secrets — not a Vercel / app env):

| Secret | Required for | Notes |
|--------|----------------|-------|
| `NOTION_API_KEY` | PR → Notion sync Action | Same Notion token as the app; stored in GitHub Actions only |

Link resolution: Notion task URL in the PR body (preferred), else match task `PR` / unambiguous `Repo` fields.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Click **`[ sync ]`** to pull fresh data.

## Deploy to Vercel

1. Import the repo in [Vercel](https://vercel.com/new).
2. Add **Upstash Redis** from the Vercel Marketplace and link it to the project (sets `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`).
3. Add `NOTION_API_KEY` (and optionally `ACCESS_PASSWORD`) in project environment variables.
4. Deploy.

Without Redis env vars, the app falls back to the local file cache (works in dev, not on Vercel serverless).

## API

| Route | Method | Description |
|-------|--------|-------------|
| `/api/sync` | POST | Fetch Notion → write unified cache |
| `/api/state` | GET | Return cached snapshot (`?force=1` to sync first) |

## Ops rules (Company OS)

- Notion owns work state; Cursor executes; GitHub reports PR state back; this terminal only renders Notion
- Read-only mirror — does not write to Notion
- App runtime: `NOTION_API_KEY` + optional `ACCESS_PASSWORD` only (no Linear / GitHub app envs)
- Database IDs match `Interfaces-Company/docs/notion.md`
- Replaces the Notion Focus page as the daily snapshot
- Retired sources (Linear, Focus page slots, Work Queue, Resume, Cycles) are not used

## Repo

https://github.com/interfaces-technology/ops-terminal

Docs: [Interfaces-Company](https://github.com/interfaces-technology/Interfaces-Company) (`docs/company-os.md`, `docs/notion.md`)
