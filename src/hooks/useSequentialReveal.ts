"use client";

import {
  buildLineSequence,
  LINE_INTERVAL_MS,
  PROGRESS_FILL_MS,
  type SequenceItem,
} from "@/lib/terminal-sequence";
import type { LinkedLine, TerminalDashboard } from "@/types/terminal";
import { useEffect, useMemo, useState } from "react";

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function isProgressItem(item: SequenceItem): item is Extract<SequenceItem, { type: "box-row" }> {
  return item.type === "box-row" && item.line.progress !== undefined;
}

export function useSequentialReveal(items: SequenceItem[]) {
  const [visibleCount, setVisibleCount] = useState(0);
  const [fillRatios, setFillRatios] = useState<Record<number, number>>({});
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReducedMotion(prefersReduced);
    if (prefersReduced) {
      setVisibleCount(items.length);
    }
  }, [items.length]);

  useEffect(() => {
    if (reducedMotion) {
      setVisibleCount(items.length);
      return;
    }

    if (visibleCount >= items.length) return;

    if (visibleCount === 0) {
      setVisibleCount(1);
      return;
    }

    const currentIndex = visibleCount - 1;
    const currentItem = items[currentIndex];

    if (isProgressItem(currentItem)) {
      const target = currentItem.line.progress!.ratio;
      const startedAt = performance.now();
      let raf = 0;

      const tick = (now: number) => {
        const elapsed = now - startedAt;
        const t = Math.min(1, elapsed / PROGRESS_FILL_MS);
        setFillRatios((current) => ({
          ...current,
          [currentIndex]: target * easeOutCubic(t),
        }));

        if (t < 1) {
          raf = requestAnimationFrame(tick);
          return;
        }

        window.setTimeout(() => {
          setVisibleCount((count) => count + 1);
        }, LINE_INTERVAL_MS);
      };

      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    }

    const timer = window.setTimeout(() => {
      setVisibleCount((count) => count + 1);
    }, LINE_INTERVAL_MS);

    return () => window.clearTimeout(timer);
  }, [items, reducedMotion, visibleCount]);

  const getFillRatio = (index: number, line: LinkedLine): number => {
    if (!line.progress) return 1;
    if (index < visibleCount - 1) return line.progress.ratio;
    if (index === visibleCount - 1) {
      return fillRatios[index] ?? 0;
    }
    return 0;
  };

  return {
    visibleItems: items.slice(0, visibleCount),
    visibleCount,
    getFillRatio,
    complete: visibleCount >= items.length,
  };
}

export function useLineSequence(
  dashboard: TerminalDashboard,
  setupHint: string | null | undefined,
  width: number,
) {
  return useMemo(
    () => buildLineSequence(dashboard, setupHint, width),
    [dashboard, setupHint, width],
  );
}
