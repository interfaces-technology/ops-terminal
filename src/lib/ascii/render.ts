import { box, pad, progressBar, truncate } from "@/lib/ascii/box";
import { TERMINAL_WIDTH_DESKTOP } from "@/lib/terminal-width";
import type { LinearCycle, LinearIssue, OpsSnapshot } from "@/types/ops";
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

function formatNow(snapshot: OpsSnapshot): TerminalSection {
  const slots = [1, 2, 3].map((slotNum) => {
    const slot = snapshot.notion.now.find((s) => s.slot === slotNum);
    if (!slot || slot.status === "Empty" || !slot.task) {
      return linked(`[${slotNum}] (empty)`);
    }
    const icon = slot.status === "Active" ? "▶" : slot.status === "Done" ? "✓" : "○";
    const product = slot.product ? ` · ${slot.product}` : "";
    const budget = slot.linearUrl ? 48 - OPEN_WIDTH : 48;
    return linked(`[${slotNum}] ${icon} ${truncate(slot.task, budget)}${product}`, slot.linearUrl);
  });

  return { title: "NOW · 3 slots", lines: slots };
}

function formatCycles(snapshot: OpsSnapshot): TerminalSection {
  const current = snapshot.linear.cycles.filter((c) => c.isCurrent);
  if (current.length === 0) {
    return { title: "CYCLES", lines: [{ text: "No active cycles" }] };
  }

  const lines = current.map((cycle: LinearCycle) => {
    const total = cycle.issueCount || 1;
    const done = cycle.completedCount;
    const pct = Math.round((done / total) * 100);
    return linkedWithProgress(
      `${pad(`${cycle.teamKey} cycle ${cycle.number}`, 14)} `,
      done / total,
      16,
      ` ${pad(String(pct) + "%", 4, "right")}  ${done}/${total}`,
    );
  });

  return { title: "ACTIVE CYCLES · Linear", lines };
}

function formatProjects(snapshot: OpsSnapshot): TerminalSection {
  const lines: LinkedLine[] = [];

  for (const project of snapshot.linear.projects) {
    const budget = project.url ? 22 - OPEN_WIDTH : 22;
    lines.push(
      linkedWithProgress(
        `${pad(truncate(project.name, budget), 22)} `,
        project.progress / 100,
        14,
        ` ${pad(String(project.progress) + "%", 4, "right")}  ${project.status}`,
        project.url,
      ),
    );
  }

  if (lines.length === 0) {
    lines.push({ text: "No Linear projects synced" });
  }

  return { title: "PROJECTS · Linear", lines };
}

function summarizeIssues(issues: LinearIssue[], projectName: string): LinkedLine {
  const filtered = issues.filter((i) => i.projectName === projectName);
  const done = filtered.filter((i) => i.stateType === "completed").length;
  const inProgress = filtered.filter((i) => i.stateType === "started").length;
  const todo = filtered.filter((i) => i.stateType === "unstarted" || i.stateType === "backlog").length;
  const total = filtered.length;
  if (total === 0) return linked(`${projectName}: no issues`);
  const pct = Math.round((done / total) * 100);
  return linkedWithProgress(
    `${pad(projectName, 18)} `,
    done / total,
    14,
    ` ${pct}%  (${done} done · ${inProgress} active · ${todo} open)`,
  );
}

function formatWorkbench(snapshot: OpsSnapshot): TerminalSection {
  const wbIssues = snapshot.linear.issues.filter(
    (i) => i.teamKey === "LAB" && i.projectName === "Workbench V1",
  );
  const byState = {
    open: wbIssues.filter((i) => i.stateType !== "completed" && i.stateType !== "canceled").length,
  };

  const lines: LinkedLine[] = [
    summarizeIssues(snapshot.linear.issues, "Workbench V1"),
    linked(`Total LAB issues: ${wbIssues.length}  ·  open leaf work: ${byState.open - 2}`),
    linked(""),
    linked("Open (Todo / In Progress):"),
    ...wbIssues
      .filter((i) => i.stateType !== "completed" && i.stateType !== "canceled")
      .slice(0, 8)
      .map((issue) => {
        const budget = issue.url ? 52 - OPEN_WIDTH : 52;
        return linked(
          `  ${issue.identifier}  ${truncate(issue.title, budget)}  [${issue.state}]`,
          issue.url,
        );
      }),
  ];

  return { title: "WORKBENCH V1 · Lab", lines };
}

function formatQueue(snapshot: OpsSnapshot): TerminalSection {
  const queued = snapshot.notion.workQueue
    .filter((q) => q.status === "Queued" || q.status === "In NOW")
    .slice(0, 5);

  if (queued.length === 0) {
    return { title: "WORK QUEUE · top 5", lines: [{ text: "Queue empty or not synced" }] };
  }

  const lines = queued.map((item, index) => {
    const product = item.product ? `[${item.product}] ` : "";
    const budget = item.linearUrl ? 55 - OPEN_WIDTH : 55;
    return linked(`${index + 1}. ${product}${truncate(item.title, budget)}`, item.linearUrl);
  });

  return { title: "WORK QUEUE · top 5", lines };
}

function formatResume(snapshot: OpsSnapshot): TerminalSection {
  if (snapshot.notion.resume.length === 0) {
    return { title: "RESUME · by product", lines: [{ text: "Not synced" }] };
  }

  const lines = snapshot.notion.resume.flatMap((entry) => {
    const rows: LinkedLine[] = [linked(`▸ ${entry.product}`)];
    if (entry.autoSummary) rows.push(linked(`  now: ${truncate(entry.autoSummary, 58)}`));
    if (entry.nextInQueue) rows.push(linked(`  next: ${truncate(entry.nextInQueue, 57)}`));
    if (entry.lastShipped) rows.push(linked(`  shipped: ${truncate(entry.lastShipped, 55)}`));
    return rows;
  });

  return { title: "RESUME · by product", lines: lines.slice(0, 12) };
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
    formatNow(snapshot),
    formatCycles(snapshot),
    formatProjects(snapshot),
    formatWorkbench(snapshot),
    formatQueue(snapshot),
    formatResume(snapshot),
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
