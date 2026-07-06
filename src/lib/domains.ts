import { findLinearProject } from "@/lib/sync/match";
import type { LinearProject, LinearTeamStats, NotionProject, OpsSnapshot } from "@/types/ops";

export interface OpsDomain {
  id: string;
  label: string;
  notionTags: string[];
  linearTeamKey: string | null;
}

export const OPS_DOMAINS: OpsDomain[] = [
  { id: "company", label: "Company", notionTags: ["company", "pipeline"], linearTeamKey: null },
  { id: "labs", label: "Lab", notionTags: ["labs", "lab"], linearTeamKey: "LAB" },
  { id: "play", label: "Play", notionTags: ["play"], linearTeamKey: "PLAY" },
  { id: "workbench", label: "Workbench", notionTags: ["workbench"], linearTeamKey: "WOR" },
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

export function teamStatsForDomain(
  domain: OpsDomain,
  byTeam: LinearTeamStats[],
): LinearTeamStats | undefined {
  if (!domain.linearTeamKey) return undefined;
  return byTeam.find((team) => team.teamKey === domain.linearTeamKey);
}

export function linearProjectsForDomain(
  domain: OpsDomain,
  projects: LinearProject[],
): LinearProject[] {
  if (!domain.linearTeamKey) return [];
  return projects.filter((project) => project.teamKey === domain.linearTeamKey);
}

export function isLinearProjectClaimed(
  linearProject: LinearProject,
  notionProjects: NotionProject[],
): boolean {
  return notionProjects.some((notionProject) => {
    if (notionProject.linearUrl && notionProject.linearUrl === linearProject.url) return true;
    return notionProject.name.toLowerCase() === linearProject.name.toLowerCase();
  });
}

export function linearOnlyProjectsForDomain(
  domain: OpsDomain,
  snapshot: OpsSnapshot,
): LinearProject[] {
  return linearProjectsForDomain(domain, snapshot.linear.projects).filter(
    (project) => !isLinearProjectClaimed(project, snapshot.notionProjects),
  );
}

export function classifyNotionProject(project: NotionProject): ProjectLifecycle {
  const phase = project.phase?.toLowerCase() ?? "";
  const status = project.status?.toLowerCase() ?? "";

  if (phase === "done" || status === "done") return "completed";
  if (phase === "parked" || status.includes("cancel")) return "canceled";
  return "active";
}

export function classifyLinearProject(project: LinearProject): ProjectLifecycle {
  const status = project.status.toLowerCase();
  if (status.includes("cancel")) return "canceled";
  if (status.includes("complete") || status.includes("done")) return "completed";
  return "active";
}

export function domainProjectCounts(
  domain: OpsDomain,
  snapshot: OpsSnapshot,
): DomainProjectCounts {
  const counts: DomainProjectCounts = { active: 0, completed: 0, canceled: 0 };
  const notionProjects = notionProjectsForDomain(domain, snapshot.notionProjects);

  for (const notionProject of notionProjects) {
    const linearProject = findLinearProject(notionProject, snapshot.linear.projects);
    const lifecycle = linearProject
      ? classifyLinearProject(linearProject)
      : classifyNotionProject(notionProject);
    counts[lifecycle]++;
  }

  for (const linearProject of linearOnlyProjectsForDomain(domain, snapshot)) {
    counts[classifyLinearProject(linearProject)]++;
  }

  return counts;
}

/** Strip a leading domain label/tag from a project name for display under that domain. */
export function displayProjectName(domain: OpsDomain, rawName: string): string {
  const name = rawName.trim();
  const prefixes = new Set<string>([domain.label, ...domain.notionTags]);
  if (domain.linearTeamKey) prefixes.add(domain.linearTeamKey);

  for (const prefix of prefixes) {
    const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`^${escaped}(?:\\s*[—\\-·:]\\s*|\\s+)`, "i");
    const stripped = name.replace(pattern, "").trim();
    if (stripped && stripped !== name) return stripped;
  }

  return name;
}
