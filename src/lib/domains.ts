import type { NotionProject, OpsSnapshot } from "@/types/ops";

export interface OpsDomain {
  id: string;
  label: string;
  notionTags: string[];
}

export const OPS_DOMAINS: OpsDomain[] = [
  { id: "company", label: "Company", notionTags: ["company", "pipeline"] },
  { id: "labs", label: "Lab", notionTags: ["labs", "lab"] },
  { id: "play", label: "Play", notionTags: ["play"] },
  { id: "workbench", label: "Workbench", notionTags: ["workbench"] },
];

export type ProjectLifecycle = "active" | "completed" | "canceled";

export interface DomainProjectCounts {
  active: number;
  completed: number;
  canceled: number;
}

export function notionProjectDomainId(project: NotionProject): string {
  const tag = (project.product ?? project.area ?? "").trim().toLowerCase();
  if (!tag) return "company";

  const domain = OPS_DOMAINS.find((entry) => entry.notionTags.includes(tag));
  return domain?.id ?? "company";
}

export function notionProjectsForDomain(
  domain: OpsDomain,
  projects: NotionProject[],
): NotionProject[] {
  return projects.filter((project) => notionProjectDomainId(project) === domain.id);
}

export function classifyNotionProject(project: NotionProject): ProjectLifecycle {
  const phase = project.phase?.toLowerCase() ?? "";
  const status = project.status?.toLowerCase() ?? "";

  if (phase === "done" || status === "done") return "completed";
  if (phase === "parked" || status.includes("cancel")) return "canceled";
  return "active";
}

export function domainProjectCounts(
  domain: OpsDomain,
  snapshot: OpsSnapshot,
): DomainProjectCounts {
  const counts: DomainProjectCounts = { active: 0, completed: 0, canceled: 0 };

  for (const project of notionProjectsForDomain(domain, snapshot.notionProjects)) {
    counts[classifyNotionProject(project)]++;
  }

  return counts;
}

/** Average Notion progress across all projects listed in a domain. */
export function domainProgressRatio(domain: OpsDomain, snapshot: OpsSnapshot): number {
  const progresses: number[] = [];

  for (const project of notionProjectsForDomain(domain, snapshot.notionProjects)) {
    if (project.progress != null) progresses.push(project.progress / 100);
  }

  if (progresses.length === 0) return 0;
  return progresses.reduce((sum, ratio) => sum + ratio, 0) / progresses.length;
}

/** Strip a leading domain label/tag from a project name for display under that domain. */
export function displayProjectName(domain: OpsDomain, rawName: string): string {
  const name = rawName.trim();
  const prefixes = new Set<string>([domain.label, ...domain.notionTags]);

  for (const prefix of prefixes) {
    const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`^${escaped}(?:\\s*[—\\-·:]\\s*|\\s+)`, "i");
    const stripped = name.replace(pattern, "").trim();
    if (stripped && stripped !== name) return stripped;
  }

  return name;
}
