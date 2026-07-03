import { terminalFrame } from "@/lib/terminal-frame";
import { TERMINAL_WIDTH_DESKTOP } from "@/lib/terminal-width";
import type { LinkedLine, TerminalDashboard } from "@/types/terminal";

export const LINE_INTERVAL_MS = 85;
export const PROGRESS_FILL_MS = 650;

export type SequenceItem =
  | { type: "header"; key: string; text: string }
  | { type: "hint"; key: string; text: string }
  | { type: "box-plain"; key: string; text: string }
  | { type: "box-row"; key: string; line: LinkedLine }
  | { type: "spacer"; key: string };

function boxPlainLines(title: string, lines: LinkedLine[], width: number): SequenceItem[] {
  const frame = terminalFrame(width);

  const items: SequenceItem[] = [
    { type: "box-plain", key: `${title}-top`, text: frame.top },
    { type: "box-plain", key: `${title}-title`, text: frame.titleRow(title) },
  ];

  if (lines.length > 0) {
    items.push({ type: "box-plain", key: `${title}-sep`, text: frame.sep });
  }

  for (const [index, line] of lines.entries()) {
    items.push({ type: "box-row", key: `${title}-row-${index}`, line });
  }

  items.push({ type: "box-plain", key: `${title}-bottom`, text: frame.bottom });
  return items;
}

export function buildLineSequence(
  dashboard: TerminalDashboard,
  setupHint?: string | null,
  width: number = TERMINAL_WIDTH_DESKTOP,
): SequenceItem[] {
  const items: SequenceItem[] = [];

  for (const [index, text] of dashboard.header.lines.entries()) {
    items.push({ type: "header", key: `header-${index}`, text });
  }

  if (setupHint) {
    items.push({ type: "hint", key: "setup-hint", text: setupHint });
  }

  for (const [sectionIndex, section] of dashboard.sections.entries()) {
    if (sectionIndex > 0) {
      items.push({ type: "spacer", key: `spacer-${sectionIndex}` });
    }
    items.push(...boxPlainLines(section.title, section.lines, width));
  }

  return items;
}
