import { linked, linkedWithProgress } from "@/lib/ascii/line";
import { DOMAIN_TASK_SAMPLE } from "@/lib/config";
import {
  activeProjectsForDomain,
  displayProjectName,
  domainProgressRatio,
  domainProjectCounts,
  domainTaskCounts,
  openTasksForDomain,
  OPS_DOMAINS,
  type OpsDomain,
} from "@/lib/domains";
import type { NotionProject, OpsSnapshot } from "@/types/ops";
import type { LinkedLine } from "@/types/terminal";

function formatDomainHeading(domain: OpsDomain, snapshot: OpsSnapshot): LinkedLine {
  const label = `▸ ${domain.label}`;
  const counts = domainProjectCounts(domain, snapshot);
  const taskCounts = domainTaskCounts(domain, snapshot.tasks);
  const ratio = domainProgressRatio(domain, snapshot);

  return {
    text: label,
    progress: {
      label,
      ratio,
      pct: null,
      pctColumn: `${taskCounts.open} open`,
      status: `${taskCounts.inProgress} in prog`,
    },
  };
}

function formatNotionProjectLine(project: NotionProject, domain: OpsDomain): LinkedLine {
  const status = project.status ?? project.phase ?? "—";
  const name = displayProjectName(domain, project.name);
  const pct = project.progress;
  const ratio = pct != null ? pct / 100 : 0;

  return linkedWithProgress("  ", name, "", ratio, pct, status, project.url ?? project.linkUrl);
}

function formatOpenTaskSample(domain: OpsDomain, snapshot: OpsSnapshot): LinkedLine[] {
  const tasks = openTasksForDomain(domain, snapshot.tasks)
    .filter((task) => {
      const status = task.status.toLowerCase();
      return status === "in progress" || status === "review";
    })
    .slice(0, DOMAIN_TASK_SAMPLE);

  if (tasks.length === 0) return [];

  return tasks.map((task) => {
    const type = task.type ? ` · ${task.type}` : "";
    const product = task.product ?? domain.label;
    const prHint = task.prStatus ? ` · PR ${task.prStatus}` : task.pr ? " · PR" : "";
    return linked(`    · [${product}${type}] ${task.name}${prHint}`, task.pr ?? task.url);
  });
}

function formatDomainBlock(domain: OpsDomain, snapshot: OpsSnapshot): LinkedLine[] {
  const lines: LinkedLine[] = [formatDomainHeading(domain, snapshot)];

  const activeProjects = activeProjectsForDomain(domain, snapshot.notionProjects);
  for (const project of activeProjects) {
    lines.push(formatNotionProjectLine(project, domain));
  }

  if (activeProjects.length === 0) {
    lines.push({ text: "  (no active projects)" });
  }

  lines.push(...formatOpenTaskSample(domain, snapshot));

  return lines;
}

export function formatProjectsByDomain(snapshot: OpsSnapshot): LinkedLine[] {
  const lines: LinkedLine[] = [];

  for (const [index, domain] of OPS_DOMAINS.entries()) {
    if (index > 0) lines.push({ text: "" });
    lines.push(...formatDomainBlock(domain, snapshot));
  }

  return lines;
}
