import { readCache, writeCache } from "@/lib/cache/store";
import { fetchLinearData } from "@/lib/linear/client";
import { fetchNotionData } from "@/lib/notion/client";
import type { OpsSnapshot } from "@/types/ops";

export async function syncOpsState(): Promise<OpsSnapshot> {
  const errors: string[] = [];
  const snapshot: OpsSnapshot = {
    syncedAt: new Date().toISOString(),
    linear: { issues: [], cycles: [], projects: [] },
    notion: { now: [], workQueue: [], resume: [], projects: [] },
    errors,
  };

  await Promise.all([
    fetchLinearData()
      .then((data) => {
        snapshot.linear = data;
      })
      .catch((err: unknown) => {
        errors.push(`Linear: ${err instanceof Error ? err.message : String(err)}`);
      }),
    fetchNotionData()
      .then((data) => {
        snapshot.notion = data;
      })
      .catch((err: unknown) => {
        errors.push(`Notion: ${err instanceof Error ? err.message : String(err)}`);
      }),
  ]);

  await writeCache(snapshot);
  return snapshot;
}

export async function getOpsState(forceSync = false): Promise<OpsSnapshot> {
  if (forceSync) {
    return syncOpsState();
  }

  const cached = await readCache();
  if (cached) return cached;

  return syncOpsState();
}
