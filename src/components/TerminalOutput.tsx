"use client";

import { TerminalActions } from "@/components/TerminalActions";
import { useLineSequence, useSequentialReveal } from "@/hooks/useSequentialReveal";
import { pad, progressBar, truncate } from "@/lib/ascii/box";
import type { LinkedLine, TerminalDashboard } from "@/types/terminal";
import type { SequenceItem } from "@/lib/terminal-sequence";

const WIDTH = 78;
const INNER = WIDTH - 4;
const LINK_LABEL = "[OPEN]";
const LINK_WIDTH = LINK_LABEL.length + 1;

const linkClass =
  "font-mono text-sm text-sky-400 underline underline-offset-4 hover:text-sky-300";

function rowText(line: LinkedLine, fillRatio: number): string {
  if (!line.progress) return line.text;
  const { prefix, width, suffix } = line.progress;
  return `${prefix}${progressBar(fillRatio, width)}${suffix}`;
}

function TerminalRow({
  line,
  fillRatio,
}: {
  line: LinkedLine;
  fillRatio: number;
}) {
  const content = rowText(line, fillRatio);

  if (!line.href) {
    const text = pad(truncate(content, INNER), INNER);
    return (
      <div className="terminal-line-appear whitespace-pre font-mono text-sm text-green-400">
        {`║ ${text} ║`}
      </div>
    );
  }

  const rowContent = truncate(content, INNER - LINK_WIDTH);
  const padding = INNER - rowContent.length - LINK_WIDTH;

  return (
    <div className="terminal-line-appear whitespace-pre font-mono text-sm leading-relaxed">
      <span className="text-green-400">║ {rowContent} </span>
      <a href={line.href} target="_blank" rel="noopener noreferrer" className={linkClass}>
        {LINK_LABEL}
      </a>
      <span className="text-green-400">{`${" ".repeat(Math.max(0, padding))} ║`}</span>
    </div>
  );
}

function SequenceLine({
  item,
  index,
  getFillRatio,
}: {
  item: SequenceItem;
  index: number;
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
        <div className="terminal-line-appear mb-4 max-w-full font-mono text-xs text-amber-400">
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
        <TerminalRow line={item.line} fillRatio={getFillRatio(index, item.line)} />
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
  const sequence = useLineSequence(dashboard, setupHint);
  const { visibleItems, getFillRatio, complete } = useSequentialReveal(sequence);

  return (
    <>
      <div className="max-w-full overflow-x-auto">
        {visibleItems.map((item, index) => (
          <SequenceLine
            key={item.key}
            item={item}
            index={index}
            getFillRatio={getFillRatio}
          />
        ))}
      </div>
      <TerminalActions warnings={warnings} visible={complete} />
    </>
  );
}
