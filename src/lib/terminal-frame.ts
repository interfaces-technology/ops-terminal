import { pad, truncate } from "@/lib/ascii/box";

export function terminalFrame(width: number) {
  const inner = width - 4;
  const border = width - 2;

  return {
    inner,
    top: `╔${"═".repeat(border)}╗`,
    sep: `╠${"═".repeat(border)}╣`,
    bottom: `╚${"═".repeat(border)}╝`,
    titleRow: (title: string) => `║${pad(` ${truncate(title, inner)} `, border)}║`,
    row: (content: string) => `║ ${pad(content, inner)} ║`,
    emptyRow: () => `║ ${pad("", inner)} ║`,
  };
}
