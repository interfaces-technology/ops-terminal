"use client";

import { useTerminalWidth } from "@/hooks/useTerminalWidth";
import { terminalFrame } from "@/lib/terminal-frame";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

const SPINNER = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"] as const;

export function TerminalAuth() {
  const router = useRouter();
  const width = useTerminalWidth();
  const frame = terminalFrame(width);
  const inputRef = useRef<HTMLInputElement>(null);
  const [password, setPassword] = useState("");
  const [trustDevice, setTrustDevice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const cursorTimer = window.setInterval(() => {
      setCursorVisible((current) => !current);
    }, 530);

    const spinnerTimer = window.setInterval(() => {
      setFrameIndex((current) => (current + 1) % SPINNER.length);
    }, 80);

    return () => {
      window.clearInterval(cursorTimer);
      window.clearInterval(spinnerTimer);
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!password.trim() || loading) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, trustDevice }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Access denied");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Access denied");
      setPassword("");
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  }

  const cursor = loading ? SPINNER[frameIndex] : cursorVisible ? "█" : " ";
  const masked = "*".repeat(password.length);
  const prompt = `password: ${masked}${cursor}`;
  const trustMark = trustDevice ? "x" : " ";
  const trustLine = `[${trustMark}] trust device`;
  const statusLine = loading
    ? `${SPINNER[frameIndex]} verifying…`
    : "› press enter to auth";

  return (
    <div className="terminal-shell relative flex min-h-screen flex-col items-center justify-center">
      <form onSubmit={(event) => void handleSubmit(event)} className="terminal-scroll-x max-w-full">
        <div className="font-mono text-sm leading-relaxed text-green-400">
          <div className="whitespace-pre">{frame.top}</div>
          <div className="whitespace-pre">{frame.titleRow("OPS TERMINAL — AUTH")}</div>
          <div className="whitespace-pre">{frame.sep}</div>
          <div className="whitespace-pre">{frame.emptyRow()}</div>
          <div className="whitespace-pre text-green-500/80">
            {frame.row("› Authentication required")}
          </div>
          <div className="whitespace-pre text-green-500/80">
            {frame.row("› Restricted ops dashboard")}
          </div>
          <div className="whitespace-pre">{frame.emptyRow()}</div>

          <label className="relative block whitespace-pre text-green-300">
            {`║ ${prompt.padEnd(frame.inner - 1)}`}
            <span className="text-green-400">║</span>
            <input
              ref={inputRef}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={loading}
              autoComplete="current-password"
              aria-label="Access password"
              className="absolute inset-0 cursor-text opacity-0"
            />
          </label>

          <button
            type="button"
            onClick={() => setTrustDevice((current) => !current)}
            disabled={loading}
            aria-pressed={trustDevice}
            aria-label="Trust this device"
            className="block w-full whitespace-pre text-left text-green-500/80 transition-colors hover:text-green-400 disabled:opacity-60"
          >
            {frame.row(trustLine)}
          </button>

          <div className="whitespace-pre">{frame.emptyRow()}</div>
          <div className="whitespace-pre text-amber-400">{frame.row(statusLine)}</div>

          {error && (
            <>
              <div className="whitespace-pre">{frame.emptyRow()}</div>
              <div className="whitespace-pre text-red-400">{frame.row(`✗ ${error}`)}</div>
            </>
          )}

          <div className="whitespace-pre">{frame.emptyRow()}</div>
          <div className="whitespace-pre">{frame.bottom}</div>
        </div>
      </form>
    </div>
  );
}
