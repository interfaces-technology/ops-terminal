"use client";

import { AUTO_SYNC_INTERVAL_MS, TERMINAL_USER } from "@/lib/config";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

interface TerminalActionsProps {
  warnings: string[];
  visible?: boolean;
  width: number;
}

function formatWarnings(warnings: string[]): string {
  return ["SYNC WARNINGS", ...warnings.map((warning, index) => `${index + 1}. ${warning}`)].join(
    "\n",
  );
}

const linkClass =
  "cursor-pointer border-0 bg-transparent p-0 font-mono text-sm underline underline-offset-4 disabled:cursor-not-allowed disabled:no-underline disabled:opacity-40";

export function TerminalActions({ warnings, visible = true, width }: TerminalActionsProps) {
  if (!visible) return null;

  return <TerminalActionsPanel warnings={warnings} width={width} />;
}

function TerminalActionsPanel({ warnings, width }: { warnings: string[]; width: number }) {
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

  const actionButtons = (
    <>
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
    </>
  );

  const infoItems = (
    <>
      <span className="text-green-400">user:{TERMINAL_USER.name}</span>
      <span className="text-green-400">role:{TERMINAL_USER.role}</span>
      <span className="text-green-400">{TERMINAL_USER.company}</span>
    </>
  );

  return (
    <div
      className="terminal-line-appear mt-4 box-border w-full min-w-0 max-w-full font-mono text-sm"
      style={{ width: `min(100%, ${width}ch)` }}
    >
      <div className="box-border border border-zinc-800 p-3 text-left sm:hidden">
        <div className="flex flex-col gap-2">
          <span className="text-zinc-500">actions</span>
          <div className="flex flex-col items-start gap-2">{actionButtons}</div>
        </div>

        <div className="mt-3 flex flex-col gap-2 border-t border-zinc-800 pt-3">
          <span className="text-zinc-500">info</span>
          <div className="flex flex-col items-start gap-1 break-words">{infoItems}</div>
        </div>
      </div>

      <div className="box-border hidden w-full min-w-0 grid-cols-[minmax(0,1fr)_max-content_max-content_max-content] grid-rows-2 items-center gap-x-8 border border-zinc-800 p-4 text-left sm:grid">
        <span className="text-zinc-500">actions</span>
        {actionButtons}
        <span className="text-zinc-500">info</span>
        {infoItems}
      </div>

      {syncError && (
        <p className="mt-2 w-full text-left font-mono text-xs text-red-400">{syncError}</p>
      )}
    </div>
  );
}
