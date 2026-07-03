"use client";

import {
  BOOT_LINES,
  getLoaderPhase,
  LOADER_BOOT_MS,
  LOADER_MIN_MS,
  STATUS_MESSAGES,
  SYNC_STEPS,
  type LoaderPhase,
} from "@/lib/loader-phases";
import { useTerminalWidth } from "@/hooks/useTerminalWidth";
import { terminalFrame } from "@/lib/terminal-frame";
import { useEffect, useState } from "react";

const SPINNER = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"] as const;

type StepStatus = "pending" | "active" | "done";

function pad(text: string, width: number): string {
  if (text.length >= width) return text.slice(0, width);
  return text + " ".repeat(width - text.length);
}

function progressBar(progress: number, width: number): string {
  const clamped = Math.min(100, Math.max(0, progress));
  const filled = Math.floor((clamped / 100) * width);
  const empty = width - filled - (filled < width ? 1 : 0);
  const arrow = filled < width ? ">" : "";
  return `[${"=".repeat(filled)}${arrow}${" ".repeat(Math.max(0, empty))}]`;
}

function getStepStatuses(syncElapsedMs: number): StepStatus[] {
  const syncDurationMs = LOADER_MIN_MS - LOADER_BOOT_MS;
  const stepThresholds = SYNC_STEPS.reduce<number[]>((thresholds, step, index) => {
    const previous = thresholds[index - 1] ?? 0;
    thresholds.push(previous + step.weight * syncDurationMs);
    return thresholds;
  }, []);

  return SYNC_STEPS.map((_, index) => {
    const stepStart = index === 0 ? 0 : stepThresholds[index - 1];
    const stepEnd = stepThresholds[index];

    if (syncElapsedMs >= stepEnd) return "done";
    if (syncElapsedMs >= stepStart) return "active";
    return "pending";
  });
}

function stepPrefix(status: StepStatus, frame: number): string {
  switch (status) {
    case "pending":
      return "○ ";
    case "active":
      return `${SPINNER[frame]} `;
    case "done":
      return "✓ ";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function stepClass(status: StepStatus): string {
  switch (status) {
    case "pending":
      return "text-green-900/70";
    case "active":
      return "text-green-300";
    case "done":
      return "text-green-500/80";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function visibleBootLineCount(bootElapsedMs: number): number {
  const intervalMs = LOADER_BOOT_MS / (BOOT_LINES.length + 1);
  return Math.min(BOOT_LINES.length, Math.floor(bootElapsedMs / intervalMs));
}

function BootPhase({ bootElapsedMs, width }: { bootElapsedMs: number; width: number }) {
  const frame = terminalFrame(width);
  const visibleLines = visibleBootLineCount(bootElapsedMs);
  const progress = (bootElapsedMs / LOADER_BOOT_MS) * 100;
  const barWidth = Math.min(36, frame.inner - 10);
  const bar = progressBar(progress, barWidth);
  const pct = `${Math.floor(progress)}%`.padStart(4);

  return (
    <div className="terminal-scroll-x max-w-full">
      <div className="font-mono text-sm leading-relaxed text-green-400">
        <div className="whitespace-pre">{frame.top}</div>
        <div className="whitespace-pre">{frame.titleRow("OPS TERMINAL — BOOT")}</div>
        <div className="whitespace-pre">{frame.sep}</div>
        <div className="whitespace-pre">{frame.emptyRow()}</div>

        {BOOT_LINES.slice(0, visibleLines).map((line, index) => (
          <div
            key={line}
            className="loader-line-in whitespace-pre text-green-500/80"
            style={{ animationDelay: `${index * 80}ms` }}
          >
            {frame.row(`› ${line}`)}
          </div>
        ))}

        <div className="whitespace-pre">{frame.emptyRow()}</div>
        <div className="whitespace-pre">{frame.row(`${bar} ${pct}`)}</div>
        <div className="whitespace-pre">{frame.emptyRow()}</div>
        <div className="whitespace-pre">{frame.bottom}</div>
      </div>
    </div>
  );
}

function SyncPhase({
  syncElapsedMs,
  frameIndex,
  statusIndex,
  cursorVisible,
  width,
}: {
  syncElapsedMs: number;
  frameIndex: number;
  statusIndex: number;
  cursorVisible: boolean;
  width: number;
}) {
  const frame = terminalFrame(width);
  const syncDurationMs = LOADER_MIN_MS - LOADER_BOOT_MS;
  const progress = (syncElapsedMs / syncDurationMs) * 100;
  const stepStatuses = getStepStatuses(syncElapsedMs);
  const barWidth = Math.min(36, frame.inner - 10);
  const bar = progressBar(progress, barWidth);
  const pct = `${Math.floor(progress)}%`.padStart(4);
  const statusLine = `${SPINNER[frameIndex]} ${STATUS_MESSAGES[statusIndex]}`;
  const cursor = cursorVisible ? "█" : " ";

  return (
    <div className="terminal-scroll-x max-w-full">
      <div className="font-mono text-sm leading-relaxed text-green-400">
        <div className="whitespace-pre">{frame.top}</div>
        <div className="whitespace-pre">{frame.titleRow("OPS TERMINAL — SYNCING")}</div>
        <div className="whitespace-pre">{frame.sep}</div>
        <div className="whitespace-pre">{frame.emptyRow()}</div>

        {SYNC_STEPS.map((step, index) => (
          <div
            key={step.label}
            className={`whitespace-pre ${stepClass(stepStatuses[index])}`}
          >
            {frame.row(`${stepPrefix(stepStatuses[index], frameIndex)}${step.label}`)}
          </div>
        ))}

        <div className="whitespace-pre">{frame.emptyRow()}</div>
        <div className="whitespace-pre">{frame.row(`${bar} ${pct}`)}</div>
        <div className="whitespace-pre">{frame.emptyRow()}</div>
        <div className="whitespace-pre text-green-300">
          {`║ ${pad(statusLine, frame.inner - 1)}${cursor}║`}
        </div>
        <div className="whitespace-pre">{frame.emptyRow()}</div>
        <div className="whitespace-pre">{frame.bottom}</div>
      </div>
    </div>
  );
}

function phaseContent(
  phase: LoaderPhase,
  props: {
    bootElapsedMs: number;
    syncElapsedMs: number;
    frameIndex: number;
    statusIndex: number;
    cursorVisible: boolean;
    width: number;
  },
) {
  switch (phase) {
    case "boot":
      return <BootPhase bootElapsedMs={props.bootElapsedMs} width={props.width} />;
    case "sync":
      return (
        <SyncPhase
          syncElapsedMs={props.syncElapsedMs}
          frameIndex={props.frameIndex}
          statusIndex={props.statusIndex}
          cursorVisible={props.cursorVisible}
          width={props.width}
        />
      );
    default: {
      const _exhaustive: never = phase;
      return _exhaustive;
    }
  }
}

export function TerminalLoader() {
  const width = useTerminalWidth();
  const [frameIndex, setFrameIndex] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [statusIndex, setStatusIndex] = useState(0);
  const [cursorVisible, setCursorVisible] = useState(true);

  useEffect(() => {
    const startedAt = Date.now();

    const spinnerTimer = setInterval(() => {
      setFrameIndex((current) => (current + 1) % SPINNER.length);
    }, 80);

    const progressTimer = setInterval(() => {
      setElapsedMs(Math.min(LOADER_MIN_MS, Date.now() - startedAt));
    }, 50);

    const statusTimer = setInterval(() => {
      setStatusIndex((current) => (current + 1) % STATUS_MESSAGES.length);
    }, 1400);

    const cursorTimer = setInterval(() => {
      setCursorVisible((current) => !current);
    }, 530);

    return () => {
      clearInterval(spinnerTimer);
      clearInterval(progressTimer);
      clearInterval(statusTimer);
      clearInterval(cursorTimer);
    };
  }, []);

  const phase = getLoaderPhase(elapsedMs);
  const bootElapsedMs = Math.min(elapsedMs, LOADER_BOOT_MS);
  const syncElapsedMs = Math.max(0, elapsedMs - LOADER_BOOT_MS);

  return (
    <div className="terminal-shell relative flex min-h-screen flex-col items-center justify-center">
      {phaseContent(phase, {
        bootElapsedMs,
        syncElapsedMs,
        frameIndex,
        statusIndex,
        cursorVisible,
        width,
      })}
    </div>
  );
}
