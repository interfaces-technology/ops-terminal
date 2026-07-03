import { box, pad, progressBar, truncate } from "@/lib/ascii/box";
import type { LinearCycle, LinearIssue, OpsSnapshot } from "@/types/ops";

const WIDTH = 78;

function formatNow(snapshot: OpsSnapshot): string[] {
  const slots = [1, 2, 3].map((slotNum) => {
    const slot = snapshot.notion.now.find((s) => s.slot === slotNum);
    if (!slot || slot.status === "Empty" || !slot.task) {
      return `[${slotNum}] (empty)`;
    }
    const icon = slot.status === "Active" ? "▶" : slot.status === "Done" ? "✓" : "○";
    const product = slot.product ? ` · ${slot.product}` : "";
    return `[${slotNum}] ${icon} ${truncate(slot.task, 48)}${product}`;
  });
  return box("NOW · 3 slots", slots, WIDTH);
}

function formatCycles(snapshot: OpsSnapshot): string[] {
  const current = snapshot.linear.cycles.filter((c) => c.isCurrent);
  if (current.length === 0) {
    return box("CYCLES", ["No active cycles"], WIDTH);
  }

  const lines = current.map((cycle: LinearCycle) => {
    const total = cycle.issueCount || 1;
    const done = cycle.completedCount;
    const pct = Math.round((done / total) * 100);
    const bar = progressBar(done / total, 16);
    return `${pad(`${cycle.teamKey} cycle ${cycle.number}`, 14)} ${bar} ${pad(String(pct) + "%", 4, "right")}  ${done}/${total}`;
  });

  return box("ACTIVE CYCLES · Linear", lines, WIDTH);
}

function formatProjects(snapshot: OpsSnapshot): string[] {
  const lines: string[] = [];

  for (const project of snapshot.linear.projects) {
    const bar = progressBar(project.progress / 100, 14);
    lines.push(`${pad(project.name, 22)} ${bar} ${pad(String(project.progress) + "%", 4, "right")}  ${project.status}`);
  }

  if (lines.length === 0) {
    lines.push("No Linear projects synced");
  }

  return box("PROJECTS · Linear", lines, WIDTH);
}

function summarizeIssues(issues: LinearIssue[], projectName: string): string {
  const filtered = issues.filter((i) => i.projectName === projectName);
  const done = filtered.filter((i) => i.stateType === "completed").length;
  const inProgress = filtered.filter((i) => i.stateType === "started").length;
  const todo = filtered.filter((i) => i.stateType === "unstarted" || i.stateType === "backlog").length;
  const total = filtered.length;
  if (total === 0) return `${projectName}: no issues`;
  const pct = Math.round((done / total) * 100);
  return `${pad(projectName, 18)} ${progressBar(done / total, 14)} ${pct}%  (${done} done · ${inProgress} active · ${todo} open)`;
}

function formatWorkbench(snapshot: OpsSnapshot): string[] {
  const wbIssues = snapshot.linear.issues.filter(
    (i) => i.teamKey === "LAB" && i.projectName === "Workbench V1",
  );
  const byState = {
    done: wbIssues.filter((i) => i.stateType === "completed").length,
    active: wbIssues.filter((i) => i.stateType === "started").length,
    open: wbIssues.filter((i) => i.stateType !== "completed" && i.stateType !== "canceled").length,
  };

  const lines = [
    summarizeIssues(snapshot.linear.issues, "Workbench V1"),
    `Total LAB issues: ${wbIssues.length}  ·  open leaf work: ${byState.open - 2}`,
    "",
    "Open (Todo / In Progress):",
    ...wbIssues
      .filter((i) => i.stateType !== "completed" && i.stateType !== "canceled")
      .slice(0, 8)
      .map((i) => `  ${i.identifier}  ${truncate(i.title, 52)}  [${i.state}]`),
  ];

  return box("WORKBENCH V1 · Lab", lines, WIDTH);
}

function formatQueue(snapshot: OpsSnapshot): string[] {
  const queued = snapshot.notion.workQueue
    .filter((q) => q.status === "Queued" || q.status === "In NOW")
    .slice(0, 5);

  if (queued.length === 0) {
    return box("WORK QUEUE · top 5", ["Queue empty or not synced"], WIDTH);
  }

  const lines = queued.map((item, i) => {
    const product = item.product ? `[${item.product}] ` : "";
    return `${i + 1}. ${product}${truncate(item.title, 55)}`;
  });

  return box("WORK QUEUE · top 5", lines, WIDTH);
}

function formatResume(snapshot: OpsSnapshot): string[] {
  if (snapshot.notion.resume.length === 0) {
    return box("RESUME · by product", ["Not synced"], WIDTH);
  }

  const lines = snapshot.notion.resume.flatMap((entry) => {
    const rows = [`▸ ${entry.product}`];
    if (entry.autoSummary) rows.push(`  now: ${truncate(entry.autoSummary, 58)}`);
    if (entry.nextInQueue) rows.push(`  next: ${truncate(entry.nextInQueue, 57)}`);
    if (entry.lastShipped) rows.push(`  shipped: ${truncate(entry.lastShipped, 55)}`);
    return rows;
  });

  return box("RESUME · by product", lines.slice(0, 12), WIDTH);
}

function formatHeader(snapshot: OpsSnapshot): string[] {
  const synced = new Date(snapshot.syncedAt).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const errors = snapshot.errors.length > 0 ? `  ⚠ ${snapshot.errors.length} sync warning(s)` : "";
  return [
    "",
    "  INTERFACES COMPANY · OPS TERMINAL",
    `  synced ${synced}${errors}`,
    "",
  ];
}

function formatErrors(snapshot: OpsSnapshot): string[] {
  if (snapshot.errors.length === 0) return [];
  return box("SYNC WARNINGS", snapshot.errors, WIDTH);
}

function formatFooter(): string[] {
  return [
    "",
    "  [r] refresh   ·   POST /api/sync   ·   docs: Interfaces-Company/docs/",
    "",
  ];
}

export function renderDashboard(snapshot: OpsSnapshot): string {
  const sections = [
    ...formatHeader(snapshot),
    ...formatNow(snapshot),
    "",
    ...formatCycles(snapshot),
    "",
    ...formatProjects(snapshot),
    "",
    ...formatWorkbench(snapshot),
    "",
    ...formatQueue(snapshot),
    "",
    ...formatResume(snapshot),
    ...formatErrors(snapshot),
    ...formatFooter(),
  ];

  return sections.join("\n");
}
