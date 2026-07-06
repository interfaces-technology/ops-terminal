import type { LinearProject, NotionProject } from "@/types/ops";

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
