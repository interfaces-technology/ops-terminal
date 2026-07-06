import { box, pad } from "@/lib/ascii/box";
import { formatProjectsByDomain } from "@/lib/ascii/projects";
import { OPS_DOMAINS } from "@/lib/domains";
import { formatRowText, linked, linkedWithProgress } from "@/lib/ascii/line";
import { TERMINAL_WIDTH_DESKTOP, terminalInner } from "@/lib/terminal-width";
import type { OpsSnapshot } from "@/types/ops";
import type { LinkedLine, TerminalDashboard, TerminalSection } from "@/types/terminal";

const WIDTH = TERMINAL_WIDTH_DESKTOP;
const INNER = terminalInner(WIDTH);

function formatTargetDate(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

function formatShipDate(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function formatFocus(snapshot: OpsSnapshot): TerminalSection {
  const slots = [1, 2, 3].map((slotNum) => {
    const slot = snapshot.focus.slots.find((entry) => entry.slot === slotNum);
    if (!slot?.label) {
      return linked(`[${slotNum}] (empty)`);
    }

    return linkedWithProgress(
      `[${slotNum}] ▶ `,
      slot.label,
      "",
      (slot.progress ?? 0) / 100,
      slot.progress,
      slot.linearState ?? "—",
      slot.url,
    );
  });

  return { title: "FOCUS · milestones & sprints", lines: slots };
}

function formatHorizon(snapshot: OpsSnapshot): TerminalSection {
  if (snapshot.horizon.length === 0) {
    return { title: "HORIZON · Now", lines: [{ text: "No committed aims (Status: Now)" }] };
  }

  const lines = snapshot.horizon.map((item) => {
    const target = formatTargetDate(item.target);
    const targetText = target ? pad(target, 12, "right") : pad("", 12);
    const area = item.area ? ` · ${item.area}` : "";
    return linked(`${item.aim}${area}  ${targetText}`, item.linearInitiativeUrl);
  });

  return { title: "HORIZON · Now", lines };
}

function formatProjects(snapshot: OpsSnapshot): TerminalSection {
  const domainLabels = OPS_DOMAINS.map((domain) => domain.label).join(" · ");
  return {
    title: `DOMAINS · ${domainLabels}`,
    lines: formatProjectsByDomain(snapshot),
  };
}

function formatShipLog(snapshot: OpsSnapshot): TerminalSection {
  if (snapshot.shipLog.length === 0) {
    return { title: "SHIP LOG · recent", lines: [{ text: "Nothing logged recently" }] };
  }

  const lines = snapshot.shipLog.slice(0, 5).map((entry) => {
    const date = formatShipDate(entry.date);
    const product = entry.product ? `${entry.product} · ` : "";
    const datePart = date ? `${date} · ` : "";
    return linked(`${product}${datePart}${entry.title}`, entry.linearUrl);
  });

  return { title: "SHIP LOG · recent", lines };
}

function formatHeader(snapshot: OpsSnapshot): string[] {
  const synced = new Date(snapshot.syncedAt).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const errors = snapshot.errors.length > 0 ? `  ⚠ ${snapshot.errors.length} sync warning(s)` : "";
  return ["", "OPS TERMINAL", `synced ${synced}${errors}`, ""];
}

function formatErrors(snapshot: OpsSnapshot): TerminalSection | null {
  if (snapshot.errors.length === 0) return null;
  return {
    title: "SYNC WARNINGS",
    lines: snapshot.errors.map((error) => linked(error)),
  };
}

function lineDisplayText(line: LinkedLine): string {
  const ratio = line.progress?.ratio ?? 1;
  return formatRowText(line, ratio, INNER);
}

export function renderDashboardSections(snapshot: OpsSnapshot): TerminalDashboard {
  const sections: TerminalSection[] = [
    formatFocus(snapshot),
    formatHorizon(snapshot),
    formatProjects(snapshot),
    formatShipLog(snapshot),
  ];

  const errors = formatErrors(snapshot);
  if (errors) sections.push(errors);

  return {
    header: { lines: formatHeader(snapshot) },
    sections,
  };
}

export function renderDashboard(snapshot: OpsSnapshot): string {
  const { header, sections } = renderDashboardSections(snapshot);

  const parts = [...header.lines];

  for (const [index, section] of sections.entries()) {
    if (index > 0) parts.push("");
    parts.push(
      ...box(
        section.title,
        section.lines.map((line) => lineDisplayText(line)),
        WIDTH,
      ),
    );
  }

  return parts.join("\n");
}
