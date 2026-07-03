"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RefreshButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRefresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? "Sync failed");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 flex flex-col items-end gap-2">
      {error && (
        <span className="text-xs text-red-400 font-mono max-w-xs text-right">{error}</span>
      )}
      <button
        type="button"
        onClick={handleRefresh}
        disabled={loading}
        className="border border-zinc-600 bg-zinc-900 px-4 py-2 font-mono text-sm text-green-400 hover:bg-zinc-800 disabled:opacity-50"
      >
        {loading ? "syncing…" : "[ sync ]"}
      </button>
    </div>
  );
}
