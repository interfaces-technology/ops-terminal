import { pad, truncate } from "@/lib/ascii/box";
import type { LinkedLine, TerminalDashboard } from "@/types/terminal";

export const LINE_INTERVAL_MS = 85;
export const PROGRESS_FILL_MS = 650;

const WIDTH = 78;
const INNER = WIDTH - 4;

export type SequenceItem =
  | { type: "header"; key: string; text: string }
  | { type: "hint"; key: string; text: string }
  | { type: "box-plain"; key: string; text: string }
  | { type: "box-row"; key: string; line: LinkedLine }
  | { type: "spacer"; key: string };

function boxPlainLines(title: string, lines: LinkedLine[]): SequenceItem[] {
  const header = ` ${truncate(title, INNER)} `;
  const top = "╔" + "═".repeat(WIDTH - 2) + "╗";
  const titleRow = "║" + pad(header, WIDTH - 2) + "║";
  const sep = "╠" + "═".repeat(WIDTH - 2) + "╣";
  const bottom = "╚" + "═".repeat(WIDTH - 2) + "╝";

  const items: SequenceItem[] = [
    { type: "box-plain", key: `${title}-top`, text: top },
    { type: "box-plain", key: `${title}-title`, text: titleRow },
  ];

  if (lines.length > 0) {
    items.push({ type: "box-plain", key: `${title}-sep`, text: sep });
  }

  for (const [index, line] of lines.entries()) {
    items.push({ type: "box-row", key: `${title}-row-${index}`, line });
  }

  items.push({ type: "box-plain", key: `${title}-bottom`, text: bottom });
  return items;
}

export function buildLineSequence(
  dashboard: TerminalDashboard,
  setupHint?: string | null,
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
    items.push(...boxPlainLines(section.title, section.lines));
  }

  return items;
}
