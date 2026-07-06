import type { LinearProject, NotionProject } from "@/types/ops";

export interface ResolvedProjectProgress {
  ratio: number;
  pct: number | null;
}

/** Average Notion and Linear progress when both exist; use whichever is available. */
export function resolveProjectProgress(
  notionProject?: NotionProject | null,
  linearProject?: LinearProject | null,
): ResolvedProjectProgress {
  const values: number[] = [];
  if (notionProject?.progress != null) values.push(notionProject.progress);
  if (linearProject?.progress != null) values.push(linearProject.progress);

  if (values.length === 0) return { ratio: 0, pct: null };

  const pct = Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  return { ratio: pct / 100, pct };
}

export function findLinearProject(
  notionProject: NotionProject,
  linearProjects: LinearProject[],
): LinearProject | undefined {
  if (notionProject.linearUrl) {
    const match = linearProjects.find((project) => project.url === notionProject.linearUrl);
    if (match) return match;
  }

  const normalizedName = notionProject.name.toLowerCase();
  return linearProjects.find((project) => project.name.toLowerCase() === normalizedName);
}
