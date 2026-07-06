"use client";

import { TerminalActions } from "@/components/TerminalActions";
import { useFollowScroll } from "@/hooks/useFollowScroll";
import { useLineSequence, useSequentialReveal } from "@/hooks/useSequentialReveal";
import { useTerminalWidth } from "@/hooks/useTerminalWidth";
import { pad, truncate } from "@/lib/ascii/box";
import { buildProgressGrid } from "@/lib/ascii/columns";
import { formatRowBody, progressLeftZone } from "@/lib/ascii/line";
import { terminalInner } from "@/lib/terminal-width";
import type { LinkedLine, TerminalDashboard } from "@/types/terminal";
import type { SequenceItem } from "@/lib/terminal-sequence";
import { useEffect } from "react";

const linkClass =
  "font-mono text-sm text-green-400 no-underline hover:text-green-300 hover:underline hover:underline-offset-4 hover:decoration-green-700";

function ExternalLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
      {children}
    </a>
  );
}

function ProgressGridTail({
  line,
  fillRatio,
  inner,
}: {
  line: LinkedLine;
  fillRatio: number;
  inner: number;
}) {
  const progress = line.progress!;
  const grid = buildProgressGrid(
    fillRatio,
    progress.pct,
    progress.status,
    inner,
    progress.pctColumn,
  );
  const leftZone = progressLeftZone(inner);

  if (line.href && line.linkText != null && line.linkPrefix != null) {
    const maxName = Math.max(1, leftZone - line.linkPrefix.length - (line.linkSuffix?.length ?? 0));
    const name = truncate(line.linkText, maxName);
    const linkSuffix = line.linkSuffix ?? "";
    const afterLink =
      linkSuffix + " ".repeat(leftZone - line.linkPrefix.length - name.length - linkSuffix.length);

    return (
      <>
        <span className="text-green-400">{line.linkPrefix}</span>
        <ExternalLink href={line.href}>{name}</ExternalLink>
        <span className="text-green-400">
          {afterLink}
          {grid.block}
        </span>
      </>
    );
  }

  const displayLabel = truncate(progress.label, leftZone);
  const gap = leftZone - displayLabel.length;

  return (
    <span className="text-green-400">
      {displayLabel}
      {" ".repeat(gap)}
      {grid.block}
    </span>
  );
}

function TerminalRow({
  line,
  fillRatio,
  inner,
}: {
  line: LinkedLine;
  fillRatio: number;
  inner: number;
}) {
  if (line.progress) {
    return (
      <div className="terminal-line-appear whitespace-pre font-mono text-sm leading-relaxed">
        <span className="text-green-400">║ </span>
        <ProgressGridTail line={line} fillRatio={fillRatio} inner={inner} />
        <span className="text-green-400"> ║</span>
      </div>
    );
  }

  const content = formatRowBody(line, fillRatio, inner);

  if (line.href && line.linkText) {
    const text = truncate(line.linkText, inner);
    const gap = inner - text.length;
    return (
      <div className="terminal-line-appear whitespace-pre font-mono text-sm leading-relaxed">
        <span className="text-green-400">║ </span>
        <ExternalLink href={line.href}>{text}</ExternalLink>
        <span className="text-green-400">{`${" ".repeat(Math.max(0, gap))} ║`}</span>
      </div>
    );
  }

  const text = pad(truncate(content, inner), inner);
  return (
    <div className="terminal-line-appear whitespace-pre font-mono text-sm text-green-400">
      {`║ ${text} ║`}
    </div>
  );
}

function SequenceLine({
  item,
  index,
  inner,
  getFillRatio,
}: {
  item: SequenceItem;
  index: number;
  inner: number;
  getFillRatio: (index: number, line: LinkedLine) => number;
}) {
  switch (item.type) {
    case "header":
      return (
        <div className="terminal-line-appear whitespace-pre font-mono text-sm leading-relaxed text-green-400">
          {item.text}
        </div>
      );
    case "hint":
      return (
        <div className="terminal-line-appear mb-4 max-w-full break-words font-mono text-xs text-amber-400">
          {item.text}
        </div>
      );
    case "spacer":
      return <div className="terminal-line-appear mt-4" aria-hidden="true" />;
    case "box-plain":
      return (
        <div className="terminal-line-appear whitespace-pre font-mono text-sm leading-relaxed text-green-400">
          {item.text}
        </div>
      );
    case "box-row":
      return (
        <TerminalRow
          line={item.line}
          fillRatio={getFillRatio(index, item.line)}
          inner={inner}
        />
      );
    default: {
      const _exhaustive: never = item;
      return _exhaustive;
    }
  }
}

interface TerminalOutputProps {
  dashboard: TerminalDashboard;
  setupHint?: string | null;
  warnings: string[];
}

export function TerminalOutput({ dashboard, setupHint, warnings }: TerminalOutputProps) {
  const width = useTerminalWidth();
  const inner = terminalInner(width);
  const sequence = useLineSequence(dashboard, setupHint, width);
  const { visibleItems, visibleCount, getFillRatio, complete } = useSequentialReveal(sequence);
  const { scrollToLatest } = useFollowScroll();

  useEffect(() => {
    if (complete) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => scrollToLatest(true));
      });
      return;
    }

    scrollToLatest();
  }, [visibleCount, complete, scrollToLatest]);

  return (
    <div
      className="mx-auto box-border w-full min-w-0 max-w-full font-mono text-sm"
      style={{ width: `min(100%, ${width}ch)` }}
    >
      <div className="terminal-scroll-x w-full min-w-0">
        {visibleItems.map((item, index) => (
          <SequenceLine
            key={item.key}
            item={item}
            index={index}
            inner={inner}
            getFillRatio={getFillRatio}
          />
        ))}
      </div>
      <TerminalActions warnings={warnings} visible={complete} width={width} />
    </div>
  );
}
