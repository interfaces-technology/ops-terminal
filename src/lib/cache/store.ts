import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { CACHE_PATH } from "@/lib/config";
import type { OpsSnapshot } from "@/types/ops";

function cacheFilePath(): string {
  return path.join(/* turbopackIgnore: true */ process.cwd(), CACHE_PATH);
}

export async function readCache(): Promise<OpsSnapshot | null> {
  try {
    const raw = await readFile(cacheFilePath(), "utf8");
    return JSON.parse(raw) as OpsSnapshot;
  } catch {
    return null;
  }
}

export async function writeCache(snapshot: OpsSnapshot): Promise<void> {
  const file = cacheFilePath();
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(snapshot, null, 2), "utf8");
}
