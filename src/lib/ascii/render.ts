import { box, pad } from "@/lib/ascii/box";
import { formatProjectsByDomain } from "@/lib/ascii/projects";
import { OPS_DOMAINS } from "@/lib/domains";
import { formatRowText, linked } from "@/lib/ascii/line";
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

function formatToday(snapshot: OpsSnapshot): TerminalSection {
  if (snapshot.today.length === 0) {
    return {
      title: "TODAY · in progress",
      lines: [{ text: "No tasks in progress — mark Tasks In progress in Notion" }],
    };
  }

  const lines: LinkedLine[] = [];

  for (const task of snapshot.today) {
    const type = task.type ? ` · ${task.type}` : "";
    const product = task.product ?? task.space;
    lines.push(linked(`[${product}${type}] ${task.name}`, task.url));

    if (task.pr || task.prStatus || task.branch) {
      const bits = ["PR"];
      if (task.prStatus) bits.push(task.prStatus);
      if (task.branch) bits.push(task.branch);
      lines.push(linked(`  ${bits.join(" · ")}`, task.pr ?? task.repo));
    }
  }

  return { title: "TODAY · in progress", lines };
}

function formatReviewQueue(snapshot: OpsSnapshot): TerminalSection {
  if (snapshot.reviewQueue.length === 0) {
    return {
      title: "REVIEW QUEUE",
      lines: [
        {
          text: "No tasks awaiting review — set PR, Status Review, or PR status Open/Draft/Ready in Notion",
        },
      ],
    };
  }

  const lines: LinkedLine[] = [];

  for (const task of snapshot.reviewQueue) {
    const type = task.type ? ` · ${task.type}` : "";
    const product = task.product ?? task.space;
    lines.push(linked(`[${product}${type}] ${task.name}`, task.url));

    if (task.pr || task.prStatus || task.branch || task.repo) {
      const bits: string[] = [];
      if (task.prStatus) bits.push(task.prStatus);
      if (task.branch) bits.push(task.branch);
      if (task.pr) bits.push("PR");
      else if (task.repo) bits.push("repo");
      lines.push(linked(`  ${bits.join(" · ")}`, task.pr ?? task.repo));
    }
  }

  return { title: "REVIEW QUEUE", lines };
}

function milestonesForHorizon(snapshot: OpsSnapshot, horizonUrl: string | null): string[] {
  if (!horizonUrl) {
    return snapshot.milestones.map((milestone) => milestone.name);
  }

  const normalized = horizonUrl.replace(/-/g, "");
  return snapshot.milestones
    .filter((milestone) => {
      if (!milestone.horizonUrl) return true;
      return milestone.horizonUrl.replace(/-/g, "").includes(normalized.slice(-32));
    })
    .map((milestone) => milestone.name);
}

function formatHorizon(snapshot: OpsSnapshot): TerminalSection {
  if (snapshot.horizon.length === 0) {
    return { title: "HORIZON · Now", lines: [{ text: "No committed aims (Status: Now)" }] };
  }

  const lines: LinkedLine[] = [];

  for (const item of snapshot.horizon) {
    const target = formatTargetDate(item.target);
    const targetText = target ? pad(target, 12, "right") : pad("", 12);
    const area = item.area ? ` · ${item.area}` : "";
    lines.push(linked(`${item.aim}${area}  ${targetText}`, item.url ?? item.linkUrl));

    for (const milestone of milestonesForHorizon(snapshot, item.url)) {
      lines.push({ text: `  ${milestone}` });
    }
  }

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
    return linked(`${product}${datePart}${entry.title}`, entry.linkUrl);
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
    formatToday(snapshot),
    formatReviewQueue(snapshot),
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
