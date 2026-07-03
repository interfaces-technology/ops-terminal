"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

const WIDTH = 78;
const INNER = WIDTH - 4;

const SPINNER = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"] as const;

function pad(text: string, width: number): string {
  if (text.length >= width) return text.slice(0, width);
  return text + " ".repeat(width - text.length);
}

export function TerminalAuth() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const cursorTimer = window.setInterval(() => {
      setCursorVisible((current) => !current);
    }, 530);

    const spinnerTimer = window.setInterval(() => {
      setFrame((current) => (current + 1) % SPINNER.length);
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
        body: JSON.stringify({ password }),
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

  const top = "╔" + "═".repeat(WIDTH - 2) + "╗";
  const titleRow = "║" + pad(" OPS TERMINAL — AUTH ", WIDTH - 2) + "║";
  const sep = "╠" + "═".repeat(WIDTH - 2) + "╣";
  const bottom = "╚" + "═".repeat(WIDTH - 2) + "╝";
  const cursor = loading ? SPINNER[frame] : cursorVisible ? "█" : " ";
  const masked = "*".repeat(password.length);
  const prompt = `  password: ${masked}${cursor}`;
  const statusLine = loading ? `  ${SPINNER[frame]} verifying credentials…` : "  › press enter to authenticate";

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center p-4 md:p-8">
      <form onSubmit={(event) => void handleSubmit(event)} className="max-w-full overflow-x-auto">
        <div className="font-mono text-sm leading-relaxed text-green-400">
          <div className="whitespace-pre">{top}</div>
          <div className="whitespace-pre">{titleRow}</div>
          <div className="whitespace-pre">{sep}</div>
          <div className="whitespace-pre">{`║ ${pad("", INNER)} ║`}</div>
          <div className="whitespace-pre text-green-500/80">{`║ ${pad("  › Authentication required", INNER)} ║`}</div>
          <div className="whitespace-pre text-green-500/80">{`║ ${pad("  › Restricted ops dashboard", INNER)} ║`}</div>
          <div className="whitespace-pre">{`║ ${pad("", INNER)} ║`}</div>

          <label className="relative block whitespace-pre text-green-300">
            {`║ ${pad(prompt, INNER - 1)}`}
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

          <div className="whitespace-pre">{`║ ${pad("", INNER)} ║`}</div>
          <div className="whitespace-pre text-amber-400">{`║ ${pad(statusLine, INNER)} ║`}</div>

          {error && (
            <>
              <div className="whitespace-pre">{`║ ${pad("", INNER)} ║`}</div>
              <div className="whitespace-pre text-red-400">{`║ ${pad(`  ✗ ${error}`, INNER)} ║`}</div>
            </>
          )}

          <div className="whitespace-pre">{`║ ${pad("", INNER)} ║`}</div>
          <div className="whitespace-pre">{bottom}</div>
        </div>
      </form>
    </div>
  );
}
