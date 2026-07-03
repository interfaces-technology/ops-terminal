export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

export function pad(text: string, width: number, align: "left" | "right" = "left"): string {
  if (text.length >= width) return truncate(text, width);
  const padLen = width - text.length;
  return align === "left" ? text + " ".repeat(padLen) : " ".repeat(padLen) + text;
}

export function progressBar(ratio: number, width = 20): string {
  const clamped = Math.max(0, Math.min(1, ratio));
  const filled = Math.round(clamped * width);
  return "█".repeat(filled) + "░".repeat(width - filled);
}

export function box(title: string, lines: string[], width = 72): string[] {
  const inner = width - 4;
  const header = ` ${truncate(title, inner)} `;
  const top = "╔" + "═".repeat(width - 2) + "╗";
  const titleRow = "║" + pad(header, width - 2) + "║";
  const sep = "╠" + "═".repeat(width - 2) + "╣";
  const bottom = "╚" + "═".repeat(width - 2) + "╝";

  const body = lines.map((line) => "║ " + pad(truncate(line, inner), inner) + " ║");

  if (lines.length === 0) {
    return [top, titleRow, bottom];
  }

  return [top, titleRow, sep, ...body, bottom];
}

export function sectionLabel(text: string): string {
  return `\n── ${text} ${"─".repeat(Math.max(0, 60 - text.length))}`;
}
