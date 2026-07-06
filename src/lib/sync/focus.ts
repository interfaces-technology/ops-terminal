import { findLinearProject } from "@/lib/sync/match";
import type { LinearProject, NotionFocusSlot, NotionProject } from "@/types/ops";

const PRIORITY_RANK: Record<string, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const NO_PRIORITY = 999;
const NO_DATE = Number.POSITIVE_INFINITY;

export function parsePriorityRank(priority: string | null): number {
  if (!priority) return NO_PRIORITY;
  return PRIORITY_RANK[priority.toLowerCase()] ?? NO_PRIORITY;
}

export function rankProjectsForFocus(projects: NotionProject[]): NotionProject[] {
  return [...projects].sort((a, b) => {
    const priorityDiff = parsePriorityRank(a.priority) - parsePriorityRank(b.priority);
    if (priorityDiff !== 0) return priorityDiff;

    const dateA = a.target ? Date.parse(a.target) : NO_DATE;
    const dateB = b.target ? Date.parse(b.target) : NO_DATE;
    if (dateA !== dateB) return dateA - dateB;

    return a.name.localeCompare(b.name);
  });
}

export function buildFocusSlots(
  projects: NotionProject[],
  linearProjects: LinearProject[],
): NotionFocusSlot[] {
  return rankProjectsForFocus(projects)
    .slice(0, 3)
    .map((project, index) => {
      const linear = findLinearProject(project, linearProjects);
      return {
        slot: (index + 1) as 1 | 2 | 3,
        label: project.name,
        area: project.product ?? project.area,
        url: linear?.url ?? project.linearUrl,
        linearIdentifier: null,
        linearState: linear?.status ?? null,
        progress: linear?.progress ?? null,
      };
    });
}
