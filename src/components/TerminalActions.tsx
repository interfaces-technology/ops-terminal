"use client";

import { AUTO_SYNC_INTERVAL_MS, TERMINAL_USER } from "@/lib/config";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

interface TerminalActionsProps {
  warnings: string[];
  visible?: boolean;
}

function formatWarnings(warnings: string[]): string {
  return ["SYNC WARNINGS", ...warnings.map((warning, index) => `${index + 1}. ${warning}`)].join(
    "\n",
  );
}

const linkClass =
  "cursor-pointer border-0 bg-transparent p-0 font-mono text-sm underline underline-offset-4 disabled:cursor-not-allowed disabled:no-underline disabled:opacity-40";

export function TerminalActions({ warnings, visible = true }: TerminalActionsProps) {
  if (!visible) return null;

  return <TerminalActionsPanel warnings={warnings} />;
}

function TerminalActionsPanel({ warnings }: { warnings: string[] }) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const syncingRef = useRef(false);

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  const sync = useCallback(async () => {
    if (syncingRef.current) return;

    syncingRef.current = true;
    setSyncing(true);
    setSyncError(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? "Sync failed");
      }
      router.refresh();
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [router]);

  useEffect(() => {
    void sync();

    const intervalId = window.setInterval(() => {
      void sync();
    }, AUTO_SYNC_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [sync]);

  const copyWarnings = useCallback(async () => {
    if (warnings.length === 0) return;

    try {
      await navigator.clipboard.writeText(formatWarnings(warnings));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [warnings]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }

      if (event.key === "r" || event.key === "R") {
        event.preventDefault();
        refresh();
        return;
      }

      if (event.key === "s" || event.key === "S") {
        event.preventDefault();
        void sync();
        return;
      }

      if ((event.key === "c" || event.key === "C") && warnings.length > 0) {
        event.preventDefault();
        void copyWarnings();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [warnings.length, refresh, sync, copyWarnings]);

  return (
    <div className="terminal-line-appear mt-4 w-full max-w-[78ch] font-mono text-sm">
      <div className="grid w-full grid-cols-[1fr_max-content_max-content_max-content] items-center justify-items-start gap-8 border border-zinc-800 p-4 text-left">
        <span className="text-zinc-500">actions</span>

        <button
          type="button"
          onClick={refresh}
          disabled={syncing}
          className={`${linkClass} text-left text-green-400 decoration-green-700 hover:text-green-300`}
        >
          [r] refresh
        </button>

        <button
          type="button"
          onClick={() => void sync()}
          disabled={syncing}
          className={`${linkClass} text-left text-green-400 decoration-green-700 hover:text-green-300`}
        >
          {syncing ? (
            <span className="inline-flex items-center gap-1">
              <span className="inline-block animate-spin" aria-hidden="true">
                ↻
              </span>
              syncing…
            </span>
          ) : (
            "[s] sync"
          )}
        </button>

        <button
          type="button"
          onClick={() => void copyWarnings()}
          disabled={warnings.length === 0}
          className={`${linkClass} text-left text-amber-400 decoration-amber-700 hover:text-amber-300`}
        >
          {copied ? "[c] copied" : "[c] copy warnings"}
        </button>

        <span className="text-zinc-500">info</span>
        <span className="text-green-400">user:{TERMINAL_USER.name}</span>
        <span className="text-green-400">role:{TERMINAL_USER.role}</span>
        <span className="text-green-400">{TERMINAL_USER.company}</span>
      </div>

      {syncError && (
        <p className="mt-2 max-w-md text-left font-mono text-xs text-red-400">{syncError}</p>
      )}
    </div>
  );
}
