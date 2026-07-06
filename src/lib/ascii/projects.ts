import { formatDoneCanceledColumn } from "@/lib/ascii/columns";
import { linkedWithProgress } from "@/lib/ascii/line";
import {
  displayProjectName,
  domainProjectCounts,
  linearOnlyProjectsForDomain,
  notionProjectsForDomain,
  OPS_DOMAINS,
  teamStatsForDomain,
  type OpsDomain,
} from "@/lib/domains";
import { findLinearProject } from "@/lib/sync/match";
import type { LinearProject, NotionProject, OpsSnapshot } from "@/types/ops";
import type { LinkedLine } from "@/types/terminal";

function formatDomainHeading(domain: OpsDomain, snapshot: OpsSnapshot): LinkedLine {
  const label = `▸ ${domain.label}`;
  const counts = domainProjectCounts(domain, snapshot);
  const teamStats = teamStatsForDomain(domain, snapshot.linear.byTeam);
  const total = teamStats ? teamStats.todo + teamStats.inProgress + teamStats.done : 0;
  const ratio = total > 0 ? teamStats!.done / total : 0;

  return {
    text: label,
    progress: {
      label,
      ratio,
      pct: null,
      pctColumn: `${counts.active} act`,
      status: formatDoneCanceledColumn(counts.completed, counts.canceled),
    },
  };
}

function formatNotionProjectLine(
  project: NotionProject,
  domain: OpsDomain,
  linearProjects: LinearProject[],
): LinkedLine {
  const linearProject = findLinearProject(project, linearProjects);
  const href = linearProject?.url ?? project.linearUrl ?? null;
  const status = linearProject?.status ?? project.status ?? project.phase ?? "—";
  const name = displayProjectName(domain, project.name);

  return linkedWithProgress(
    "  ",
    name,
    "",
    linearProject ? linearProject.progress / 100 : 0,
    linearProject?.progress ?? null,
    status,
    href,
  );
}

function formatLinearProjectLine(project: LinearProject, domain: OpsDomain): LinkedLine {
  const name = displayProjectName(domain, project.name);

  return linkedWithProgress(
    "  ",
    name,
    "",
    project.progress / 100,
    project.progress,
    project.status,
    project.url,
  );
}

function formatDomainBlock(domain: OpsDomain, snapshot: OpsSnapshot): LinkedLine[] {
  const lines: LinkedLine[] = [formatDomainHeading(domain, snapshot)];

  const notionProjects = notionProjectsForDomain(domain, snapshot.notionProjects);
  for (const project of notionProjects) {
    lines.push(formatNotionProjectLine(project, domain, snapshot.linear.projects));
  }

  const linearOnly = linearOnlyProjectsForDomain(domain, snapshot);
  for (const project of linearOnly) {
    lines.push(formatLinearProjectLine(project, domain));
  }

  if (notionProjects.length === 0 && linearOnly.length === 0) {
    lines.push({ text: "  (no projects)" });
  }

  return lines;
}

export function formatProjectsByDomain(snapshot: OpsSnapshot): LinkedLine[] {
  const lines: LinkedLine[] = [];

  for (const [index, domain] of OPS_DOMAINS.entries()) {
    if (index > 0) lines.push({ text: "" });
    lines.push(...formatDomainBlock(domain, snapshot));
  }

  if (snapshot.notionProjects.length === 0 && snapshot.linear.projects.length === 0) {
    return [{ text: "No projects synced" }];
  }

  return lines;
}
