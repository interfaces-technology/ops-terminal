import { box, pad, progressBar, truncate } from "@/lib/ascii/box";
import { TERMINAL_WIDTH_DESKTOP } from "@/lib/terminal-width";
import type { LinearProject, NotionProject, OpsSnapshot } from "@/types/ops";
import type { LinkedLine, TerminalDashboard, TerminalSection } from "@/types/terminal";

const WIDTH = TERMINAL_WIDTH_DESKTOP;
const OPEN_WIDTH = " [OPEN]".length;

function linked(text: string, href?: string | null): LinkedLine {
  return href ? { text, href } : { text };
}

function linkedWithProgress(
  prefix: string,
  ratio: number,
  barWidth: number,
  suffix: string,
  href?: string | null,
): LinkedLine {
  const bar = progressBar(ratio, barWidth);
  return {
    text: `${prefix}${bar}${suffix}`,
    href: href ?? undefined,
    progress: { ratio, width: barWidth, prefix, suffix },
  };
}

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

function findLinearProject(
  notionProject: NotionProject,
  linearProjects: LinearProject[],
): LinearProject | undefined {
  if (notionProject.linearUrl) {
    const match = linearProjects.find((project) => project.url === notionProject.linearUrl);
    if (match) return match;
  }

  const normalizedName = notionProject.name.toLowerCase();
  return linearProjects.find((project) => project.name.toLowerCase() === normalizedName);
}

function formatFocus(snapshot: OpsSnapshot): TerminalSection {
  const slots = [1, 2, 3].map((slotNum) => {
    const slot = snapshot.focus.slots.find((entry) => entry.slot === slotNum);
    if (!slot?.label) {
      return linked(`[${slotNum}] (empty)`);
    }

    const stateSuffix = slot.linearState ? `  [${slot.linearState}]` : "";
    const area = slot.area ? ` · ${slot.area}` : "";
    const budget = slot.url ? 44 - OPEN_WIDTH - stateSuffix.length : 44 - stateSuffix.length;
    const label = truncate(slot.label, Math.max(12, budget));
    return linked(`[${slotNum}] ▶ ${label}${area}${stateSuffix}`, slot.url);
  });

  return { title: "FOCUS · 3 slots", lines: slots };
}

function formatHorizon(snapshot: OpsSnapshot): TerminalSection {
  if (snapshot.horizon.length === 0) {
    return { title: "HORIZON · Now", lines: [{ text: "No committed aims (Status: Now)" }] };
  }

  const lines = snapshot.horizon.map((item) => {
    const target = formatTargetDate(item.target);
    const targetText = target ? pad(target, 12, "right") : pad("", 12);
    const area = item.area ? ` · ${item.area}` : "";
    const budget = item.linearInitiativeUrl ? 34 - OPEN_WIDTH : 34;
    const aim = truncate(item.aim, budget);
    return linked(`${aim}${area}  ${targetText}`, item.linearInitiativeUrl);
  });

  return { title: "HORIZON · Now", lines };
}

function formatActiveProjects(snapshot: OpsSnapshot): TerminalSection {
  const lines: LinkedLine[] = [];

  for (const project of snapshot.notionProjects) {
    const linearProject = findLinearProject(project, snapshot.linear.projects);
    const href = linearProject?.url ?? project.linearUrl;
    const progress = linearProject?.progress ?? 0;
    const budget = href ? 22 - OPEN_WIDTH : 22;

    lines.push(
      linkedWithProgress(
        `${pad(truncate(project.name, budget), 22)} `,
        progress / 100,
        14,
        ` ${pad(String(progress) + "%", 4, "right")}  ${project.phase ?? "Active"}`,
        href,
      ),
    );
  }

  if (lines.length === 0) {
    lines.push({ text: "No active Notion projects" });
  }

  return { title: "ACTIVE · Notion + Linear", lines };
}

function formatLinearTeams(snapshot: OpsSnapshot): TerminalSection {
  if (snapshot.linear.byTeam.length === 0) {
    return { title: "LINEAR · LAB · PLAY · WOR", lines: [{ text: "Not synced" }] };
  }

  const lines = snapshot.linear.byTeam.map((team) =>
    linked(
      `${pad(team.teamKey, 6)}  ${team.todo} todo · ${team.inProgress} active · ${team.done} done`,
    ),
  );

  return { title: "LINEAR · LAB · PLAY · WOR", lines };
}

function formatLastSession(snapshot: OpsSnapshot): TerminalSection {
  const text = snapshot.focus.lastSession?.trim();
  if (!text) {
    return { title: "LAST SESSION", lines: [{ text: "Empty — update Focus in Notion" }] };
  }

  return {
    title: "LAST SESSION",
    lines: [linked(truncate(text, 62))],
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
    const budget = entry.linearUrl ? 48 - OPEN_WIDTH : 48;
    return linked(`${product}${datePart}${truncate(entry.title, budget)}`, entry.linearUrl);
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

export function renderDashboardSections(snapshot: OpsSnapshot): TerminalDashboard {
  const sections: TerminalSection[] = [
    formatFocus(snapshot),
    formatHorizon(snapshot),
    formatActiveProjects(snapshot),
    formatLinearTeams(snapshot),
    formatLastSession(snapshot),
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
    parts.push(...box(section.title, section.lines.map((line) => line.text), WIDTH));
  }

  return parts.join("\n");
}
