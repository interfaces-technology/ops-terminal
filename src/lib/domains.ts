import type { NotionProject, NotionTask, OpsSnapshot } from "@/types/ops";

export interface OpsDomain {
  id: string;
  label: string;
  notionTags: string[];
  taskSpace: NotionTask["space"] | null;
}

export const OPS_DOMAINS: OpsDomain[] = [
  { id: "company", label: "Company", notionTags: ["company", "pipeline", "partnerships"], taskSpace: "company" },
  { id: "studio", label: "Studio", notionTags: ["studio"], taskSpace: "studio" },
  { id: "lab", label: "Lab", notionTags: ["lab", "labs"], taskSpace: "lab" },
  { id: "play", label: "Play", notionTags: ["play"], taskSpace: "play" },
  { id: "workbench", label: "Workbench", notionTags: ["workbench"], taskSpace: "workbench" },
];

export type ProjectLifecycle = "active" | "completed" | "canceled";

export interface DomainProjectCounts {
  active: number;
  completed: number;
  canceled: number;
}

export interface DomainTaskCounts {
  open: number;
  inProgress: number;
}

function normalizeTag(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function notionProjectDomainId(project: NotionProject): string {
  const tag = normalizeTag(project.product ?? project.area);
  if (!tag) return "company";

  const domain = OPS_DOMAINS.find((entry) => entry.notionTags.includes(tag));
  return domain?.id ?? "company";
}

export function taskDomainId(task: NotionTask): string {
  const productTag = normalizeTag(task.product);
  if (productTag) {
    const byProduct = OPS_DOMAINS.find((entry) => entry.notionTags.includes(productTag));
    if (byProduct) return byProduct.id;
  }

  const bySpace = OPS_DOMAINS.find((entry) => entry.taskSpace === task.space);
  return bySpace?.id ?? "company";
}

export function notionProjectsForDomain(
  domain: OpsDomain,
  projects: NotionProject[],
): NotionProject[] {
  return projects.filter((project) => notionProjectDomainId(project) === domain.id);
}

export function activeProjectsForDomain(domain: OpsDomain, projects: NotionProject[]): NotionProject[] {
  return notionProjectsForDomain(domain, projects).filter((project) => {
    const phase = project.phase?.toLowerCase() ?? "";
    const status = project.status?.toLowerCase() ?? "";
    return phase === "active" || status === "active" || status === "in progress";
  });
}

export function tasksForDomain(domain: OpsDomain, tasks: NotionTask[]): NotionTask[] {
  return tasks.filter((task) => taskDomainId(task) === domain.id);
}

export function domainTaskCounts(domain: OpsDomain, tasks: NotionTask[]): DomainTaskCounts {
  const domainTasks = tasksForDomain(domain, tasks);
  let open = 0;
  let inProgress = 0;

  for (const task of domainTasks) {
    const status = task.status.toLowerCase();
    if (status === "done" || status === "archived") continue;
    open++;
    if (status === "in progress" || status === "review") inProgress++;
  }

  return { open, inProgress };
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

export function domainProgressRatio(domain: OpsDomain, snapshot: OpsSnapshot): number {
  const progresses: number[] = [];

  for (const project of activeProjectsForDomain(domain, snapshot.notionProjects)) {
    if (project.progress != null) progresses.push(project.progress / 100);
  }

  if (progresses.length === 0) return 0;
  return progresses.reduce((sum, ratio) => sum + ratio, 0) / progresses.length;
}

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

export function openTasksForDomain(domain: OpsDomain, tasks: NotionTask[]): NotionTask[] {
  return tasksForDomain(domain, tasks).filter((task) => {
    const status = task.status.toLowerCase();
    return status !== "done" && status !== "archived";
  });
}
