import { pad, truncate } from "@/lib/ascii/box";
import type { LinkedLine, TerminalDashboard } from "@/types/terminal";

const WIDTH = 78;
const INNER = WIDTH - 4;
const LINK_LABEL = "[OPEN]";
const LINK_SUFFIX = ` ${LINK_LABEL}`;
const LINK_WIDTH = LINK_SUFFIX.length;

const linkClass =
  "font-mono text-sm text-sky-400 underline underline-offset-4 hover:text-sky-300";

function TerminalRow({ line }: { line: LinkedLine }) {
  if (!line.href) {
    const text = pad(truncate(line.text, INNER), INNER);
    return <div className="whitespace-pre font-mono text-sm text-green-400">{`║ ${text} ║`}</div>;
  }

  const rowText = truncate(line.text, INNER - LINK_WIDTH);
  const padding = INNER - rowText.length - LINK_WIDTH;

  return (
    <div className="whitespace-pre font-mono text-sm leading-relaxed">
      <span className="text-green-400">║ {rowText} </span>
      <a href={line.href} target="_blank" rel="noopener noreferrer" className={linkClass}>
        {LINK_LABEL}
      </a>
      <span className="text-green-400">{`${" ".repeat(Math.max(0, padding))} ║`}</span>
    </div>
  );
}

function TerminalBox({ title, lines }: { title: string; lines: LinkedLine[] }) {
  const header = ` ${truncate(title, INNER)} `;
  const top = "╔" + "═".repeat(WIDTH - 2) + "╗";
  const titleRow = "║" + pad(header, WIDTH - 2) + "║";
  const sep = "╠" + "═".repeat(WIDTH - 2) + "╣";
  const bottom = "╚" + "═".repeat(WIDTH - 2) + "╝";

  return (
    <div className="font-mono text-sm leading-relaxed text-green-400">
      <div className="whitespace-pre">{top}</div>
      <div className="whitespace-pre">{titleRow}</div>
      {lines.length > 0 && <div className="whitespace-pre">{sep}</div>}
      {lines.map((line, index) => (
        <TerminalRow key={`${title}-${index}`} line={line} />
      ))}
      <div className="whitespace-pre">{bottom}</div>
    </div>
  );
}

interface TerminalOutputProps {
  dashboard: TerminalDashboard;
}

export function TerminalOutput({ dashboard }: TerminalOutputProps) {
  return (
    <div className="max-w-full overflow-x-auto">
      {dashboard.header.lines.map((line, index) => (
        <div key={`header-${index}`} className="whitespace-pre font-mono text-sm leading-relaxed text-green-400">
          {line}
        </div>
      ))}
      {dashboard.sections.map((section, index) => (
        <div key={`${section.title}-${index}`} className={index === 0 ? "" : "mt-4"}>
          <TerminalBox title={section.title} lines={section.lines} />
        </div>
      ))}
    </div>
  );
}
