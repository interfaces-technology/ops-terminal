import { readCache, writeCache } from "@/lib/cache/store";
import { fetchLinearData } from "@/lib/linear/client";
import { extractLinearIdentifier } from "@/lib/notion/focus";
import { fetchNotionData } from "@/lib/notion/client";
import type { OpsSnapshot } from "@/types/ops";

function emptySnapshot(): OpsSnapshot {
  return {
    syncedAt: new Date().toISOString(),
    focus: { slots: [], lastSession: null, notes: null, thisWeek: null },
    horizon: [],
    notionProjects: [],
    shipLog: [],
    linear: { issues: [], projects: [], byTeam: [] },
    errors: [],
  };
}

function enrichFocusWithLinear(snapshot: OpsSnapshot): void {
  const issueByIdentifier = new Map(
    snapshot.linear.issues.map((issue) => [issue.identifier, issue]),
  );

  for (const slot of snapshot.focus.slots) {
    const identifier =
      slot.linearIdentifier ??
      extractLinearIdentifier(slot.url) ??
      extractLinearIdentifier(slot.label);

    if (!identifier) continue;

    const issue = issueByIdentifier.get(identifier);
    if (!issue) continue;

    slot.linearIdentifier = identifier;
    slot.linearState = issue.state;
    if (!slot.url) slot.url = issue.url;
  }
}

export async function syncOpsState(): Promise<OpsSnapshot> {
  const snapshot = emptySnapshot();

  await Promise.all([
    fetchLinearData()
      .then((data) => {
        snapshot.linear = data;
      })
      .catch((err: unknown) => {
        snapshot.errors.push(`Linear: ${err instanceof Error ? err.message : String(err)}`);
      }),
    fetchNotionData()
      .then((data) => {
        snapshot.focus = data.focus;
        snapshot.horizon = data.horizon;
        snapshot.notionProjects = data.notionProjects;
        snapshot.shipLog = data.shipLog;
      })
      .catch((err: unknown) => {
        snapshot.errors.push(`Notion: ${err instanceof Error ? err.message : String(err)}`);
      }),
  ]);

  enrichFocusWithLinear(snapshot);
  await writeCache(snapshot);
  return snapshot;
}

function isValidSnapshot(snapshot: OpsSnapshot): boolean {
  return (
    snapshot.focus != null &&
    Array.isArray(snapshot.horizon) &&
    Array.isArray(snapshot.notionProjects) &&
    snapshot.linear?.byTeam != null
  );
}

export async function getOpsState(forceSync = false): Promise<OpsSnapshot> {
  if (forceSync) {
    return syncOpsState();
  }

  const cached = await readCache();
  if (cached && isValidSnapshot(cached)) return cached;

  return syncOpsState();
}
