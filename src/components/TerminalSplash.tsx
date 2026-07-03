"use client";

import { TERMINAL_USER } from "@/lib/config";
import { useEffect, useState } from "react";

function progressBar(progress: number, width: number): string {
  const clamped = Math.min(100, Math.max(0, progress));
  const filled = Math.floor((clamped / 100) * width);
  const empty = width - filled - (filled < width ? 1 : 0);
  const arrow = filled < width ? ">" : "";
  return `[${"=".repeat(filled)}${arrow}${" ".repeat(Math.max(0, empty))}]`;
}

export function TerminalSplash() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();

    const timer = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      // Creep toward 92% while the server is still loading.
      const next = Math.min(92, (elapsed / 12_000) * 92 + elapsed / 800);
      setProgress(next);
    }, 50);

    return () => clearInterval(timer);
  }, []);

  const bar = progressBar(progress, 32);
  const pct = `${Math.floor(progress)}%`.padStart(4);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8">
      <div className="text-center font-mono">
        <h1 className="text-2xl tracking-[0.2em] text-green-400 md:text-3xl">OPS TERMINAL</h1>
        <p className="mt-3 text-xs tracking-[0.35em] text-green-500/70 uppercase">
          {TERMINAL_USER.company}
        </p>

        <div className="mt-10 whitespace-pre text-sm text-green-400">
          {`${bar} ${pct}`}
        </div>
      </div>
    </div>
  );
}
