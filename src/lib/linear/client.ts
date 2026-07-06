import { LINEAR_TEAM_KEYS } from "@/lib/config";
import type { LinearIssue, LinearProject, LinearTeamStats } from "@/types/ops";

const LINEAR_API = "https://api.linear.app/graphql";

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

async function linearQuery<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const apiKey = process.env.LINEAR_API_KEY;
  if (!apiKey) {
    throw new Error("LINEAR_API_KEY is not set");
  }

  const res = await fetch(LINEAR_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey,
    },
    body: JSON.stringify({ query, variables }),
    next: { revalidate: 0 },
  });

  const json = (await res.json()) as GraphQLResponse<T>;

  if (!res.ok) {
    const detail = json.errors?.map((e) => e.message).join("; ") ?? res.statusText;
    throw new Error(`Linear API error: ${res.status} ${detail}`);
  }
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join("; "));
  }
  if (!json.data) {
    throw new Error("Linear API returned no data");
  }
  return json.data;
}

const PROJECTS_QUERY = `
  query Projects {
    projects(first: 50) {
      nodes {
        id
        name
        progress
        url
        status { name }
        teams { nodes { key } }
      }
    }
  }
`;

const ISSUES_QUERY = `
  query TeamIssues($teamKeys: [String!]!) {
    issues(
      first: 150
      filter: {
        team: { key: { in: $teamKeys } }
        state: { type: { nin: ["canceled", "duplicate"] } }
      }
    ) {
      nodes {
        id
        identifier
        title
        priority
        url
        state { name type }
        project { name }
        milestone { name }
        team { name key }
      }
    }
  }
`;

interface ProjectsQueryResult {
  projects: {
    nodes: Array<{
      id: string;
      name: string;
      progress: number;
      url: string;
      status: { name: string };
      teams: { nodes: Array<{ key: string }> };
    }>;
  };
}

interface IssuesQueryResult {
  issues: {
    nodes: Array<{
      id: string;
      identifier: string;
      title: string;
      priority: number;
      url: string;
      state: { name: string; type: string };
      project: { name: string } | null;
      milestone: { name: string } | null;
      team: { name: string; key: string };
    }>;
  };
}

function getTeamKeys(): string[] {
  const fromEnv = process.env.LINEAR_TEAM_KEYS?.split(",").map((key) => key.trim()).filter(Boolean);
  if (fromEnv && fromEnv.length > 0) return fromEnv;
  return [...LINEAR_TEAM_KEYS];
}

function computeTeamStats(issues: LinearIssue[], teamKeys: string[]): LinearTeamStats[] {
  return teamKeys.map((teamKey) => {
    const teamIssues = issues.filter((issue) => issue.teamKey === teamKey);
    return {
      teamKey,
      todo: teamIssues.filter(
        (issue) => issue.stateType === "unstarted" || issue.stateType === "backlog",
      ).length,
      inProgress: teamIssues.filter((issue) => issue.stateType === "started").length,
      done: teamIssues.filter((issue) => issue.stateType === "completed").length,
    };
  });
}

export async function fetchLinearData(): Promise<{
  issues: LinearIssue[];
  projects: LinearProject[];
  byTeam: LinearTeamStats[];
}> {
  const teamKeys = getTeamKeys();
  const teamKeySet = new Set(teamKeys);

  const [projectsData, issuesData] = await Promise.all([
    linearQuery<ProjectsQueryResult>(PROJECTS_QUERY),
    linearQuery<IssuesQueryResult>(ISSUES_QUERY, { teamKeys }),
  ]);

  const issues: LinearIssue[] = issuesData.issues.nodes.map((issue) => ({
    id: issue.id,
    identifier: issue.identifier,
    title: issue.title,
    state: issue.state.name,
    stateType: issue.state.type,
    team: issue.team.name,
    teamKey: issue.team.key,
    milestoneName: issue.milestone?.name ?? null,
    projectName: issue.project?.name ?? null,
    priority: issue.priority,
    url: issue.url,
  }));

  const projects: LinearProject[] = projectsData.projects.nodes
    .filter((project) => project.teams.nodes.some((team) => teamKeySet.has(team.key)))
    .map((project) => ({
      id: project.id,
      name: project.name,
      teamKey: project.teams.nodes[0]?.key ?? "?",
      progress: Math.round(project.progress * 100),
      status: project.status.name,
      url: project.url,
    }));

  return {
    issues,
    projects,
    byTeam: computeTeamStats(issues, teamKeys),
  };
}
