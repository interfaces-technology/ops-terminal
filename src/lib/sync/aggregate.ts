import { readCache, writeCache } from "@/lib/cache/store";
import { fetchLinearData } from "@/lib/linear/client";
import { fetchNotionData, isActiveNotionProject } from "@/lib/notion/client";
import { buildFocusSlots, rankProjectsForFocus } from "@/lib/sync/focus";
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

export async function syncOpsState(): Promise<OpsSnapshot> {
  const snapshot = emptySnapshot();
  let focusNarrative = { lastSession: null as string | null, notes: null as string | null, thisWeek: null as string | null };

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
        snapshot.horizon = data.horizon;
        snapshot.notionProjects = data.notionProjects;
        snapshot.shipLog = data.shipLog;
        focusNarrative = {
          lastSession: data.focus.lastSession,
          notes: data.focus.notes,
          thisWeek: data.focus.thisWeek,
        };
        for (const message of data.errors) {
          snapshot.errors.push(`Notion: ${message}`);
        }
      })
      .catch((err: unknown) => {
        snapshot.errors.push(`Notion: ${err instanceof Error ? err.message : String(err)}`);
      }),
  ]);

  const activeProjects = rankProjectsForFocus(
    snapshot.notionProjects.filter(isActiveNotionProject),
  );

  snapshot.focus = {
    slots: buildFocusSlots(activeProjects, snapshot.linear.projects),
    ...focusNarrative,
  };

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
  if (cached && isValidSnapshot(cached)) {
    // Retry when a prior sync left warnings (e.g. page not yet shared or token rotated).
    if (cached.errors.length > 0) return syncOpsState();
    return cached;
  }

  return syncOpsState();
}
