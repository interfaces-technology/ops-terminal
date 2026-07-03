import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { CACHE_KEY, CACHE_PATH } from "@/lib/config";
import { getRedis } from "@/lib/cache/redis";
import type { OpsSnapshot } from "@/types/ops";

function cacheFilePath(): string {
  return path.join(/* turbopackIgnore: true */ process.cwd(), CACHE_PATH);
}

async function readFileCache(): Promise<OpsSnapshot | null> {
  try {
    const raw = await readFile(cacheFilePath(), "utf8");
    return JSON.parse(raw) as OpsSnapshot;
  } catch {
    return null;
  }
}

async function writeFileCache(snapshot: OpsSnapshot): Promise<void> {
  const file = cacheFilePath();
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(snapshot, null, 2), "utf8");
}

export async function readCache(): Promise<OpsSnapshot | null> {
  const redis = getRedis();
  if (redis) {
    try {
      return await redis.get<OpsSnapshot>(CACHE_KEY);
    } catch {
      return null;
    }
  }

  return readFileCache();
}

export async function writeCache(snapshot: OpsSnapshot): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.set(CACHE_KEY, snapshot);
    return;
  }

  await writeFileCache(snapshot);
}
