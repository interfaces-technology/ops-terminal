import { pad, truncate } from "@/lib/ascii/box";
import { buildProgressGrid, gridBlockWidth } from "@/lib/ascii/columns";
import type { LinkedLine } from "@/types/terminal";

export function linked(text: string, href?: string | null): LinkedLine {
  if (!href) return { text };
  return { text, href, linkText: text };
}

export function linkedWithProgress(
  linkPrefix: string,
  name: string,
  linkSuffix: string,
  ratio: number,
  pct: number | null,
  status: string,
  href?: string | null,
  pctColumn?: string,
): LinkedLine {
  const label = `${linkPrefix}${name}${linkSuffix}`;
  const line: LinkedLine = {
    text: label,
    progress: { ratio, label, pct, status, pctColumn },
    linkPrefix,
    linkText: name,
    linkSuffix,
  };
  if (href) line.href = href;
  return line;
}

function layoutRightBlock(label: string, block: string, usable: number): string {
  const blockWidth = block.length;
  const leftZone = Math.max(4, usable - blockWidth);
  const left = truncate(label, leftZone);
  return left + " ".repeat(leftZone - left.length) + block;
}

export function formatProgressBlock(
  fillRatio: number,
  progress: NonNullable<LinkedLine["progress"]>,
  usable: number,
): string {
  const grid = buildProgressGrid(
    fillRatio,
    progress.pct,
    progress.status,
    usable,
    progress.pctColumn,
  );
  return grid.block;
}

export function progressLeftZone(usable: number): number {
  return usable - gridBlockWidth(usable);
}

function resolveDisplayLabel(line: LinkedLine, leftZone: number): string {
  if (line.linkText != null && line.linkPrefix != null && line.linkSuffix != null) {
    const maxName = Math.max(1, leftZone - line.linkPrefix.length - line.linkSuffix.length);
    const name = truncate(line.linkText, maxName);
    return line.linkPrefix + name + line.linkSuffix;
  }
  return truncate(line.progress!.label, leftZone);
}

/** Lay out label left, fixed column grid right: % | bar (2-col) | status. */
export function formatRowBody(line: LinkedLine, fillRatio: number, inner: number): string {
  const usable = inner;

  if (line.progress) {
    const block = formatProgressBlock(fillRatio, line.progress, usable);
    const leftZone = progressLeftZone(usable);
    const displayLabel = resolveDisplayLabel(line, leftZone);
    return displayLabel + " ".repeat(leftZone - displayLabel.length) + block;
  }

  if (line.href) {
    const left = truncate(line.text, usable);
    const gap = Math.max(1, usable - left.length);
    return left + " ".repeat(gap);
  }

  return pad(truncate(line.text, inner), inner);
}

export function formatRowText(line: LinkedLine, fillRatio: number, inner: number): string {
  return formatRowBody(line, fillRatio, inner);
}
