import { formatDoneCanceledColumn } from "@/lib/ascii/columns";
import { linkedWithProgress } from "@/lib/ascii/line";
import {
  displayProjectName,
  domainProgressRatio,
  domainProjectCounts,
  notionProjectsForDomain,
  OPS_DOMAINS,
  type OpsDomain,
} from "@/lib/domains";
import type { NotionProject, OpsSnapshot } from "@/types/ops";
import type { LinkedLine } from "@/types/terminal";

function formatDomainHeading(domain: OpsDomain, snapshot: OpsSnapshot): LinkedLine {
  const label = `▸ ${domain.label}`;
  const counts = domainProjectCounts(domain, snapshot);
  const ratio = domainProgressRatio(domain, snapshot);

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

function formatNotionProjectLine(project: NotionProject, domain: OpsDomain): LinkedLine {
  const status = project.status ?? project.phase ?? "—";
  const name = displayProjectName(domain, project.name);
  const pct = project.progress;
  const ratio = pct != null ? pct / 100 : 0;

  return linkedWithProgress("  ", name, "", ratio, pct, status, project.linkUrl);
}

function formatDomainBlock(domain: OpsDomain, snapshot: OpsSnapshot): LinkedLine[] {
  const lines: LinkedLine[] = [formatDomainHeading(domain, snapshot)];

  const notionProjects = notionProjectsForDomain(domain, snapshot.notionProjects);
  for (const project of notionProjects) {
    lines.push(formatNotionProjectLine(project, domain));
  }

  if (notionProjects.length === 0) {
    lines.push({ text: "  (no projects)" });
  }

  return lines;
}

export function formatProjectsByDomain(snapshot: OpsSnapshot): LinkedLine[] {
  if (snapshot.notionProjects.length === 0) {
    return [{ text: "No projects synced" }];
  }

  const lines: LinkedLine[] = [];

  for (const [index, domain] of OPS_DOMAINS.entries()) {
    if (index > 0) lines.push({ text: "" });
    lines.push(...formatDomainBlock(domain, snapshot));
  }

  return lines;
}
