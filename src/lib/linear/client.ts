import type { LinearCycle, LinearIssue, LinearProject } from "@/types/ops";

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

const CYCLES_QUERY = `
  query TeamsAndCycles {
    teams {
      nodes {
        id
        name
        key
        cycles(filter: { isPast: { eq: false } }) {
          nodes {
            id
            number
            startsAt
            endsAt
            isActive
            issueCountHistory
            completedIssueCountHistory
          }
        }
      }
    }
  }
`;

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
      first: 100
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
        cycle { number }
        project { name }
        team { name key }
      }
    }
  }
`;

interface CyclesQueryResult {
  teams: {
    nodes: Array<{
      id: string;
      name: string;
      key: string;
      cycles: {
        nodes: Array<{
          id: string;
          number: number;
          startsAt: string;
          endsAt: string;
          isActive: boolean;
          issueCountHistory: number[];
          completedIssueCountHistory: number[];
        }>;
      };
    }>;
  };
}

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
      cycle: { number: number } | null;
      project: { name: string } | null;
      team: { name: string; key: string };
    }>;
  };
}

function last<T>(arr: T[]): T | undefined {
  return arr.length > 0 ? arr[arr.length - 1] : undefined;
}

export async function fetchLinearData(): Promise<{
  issues: LinearIssue[];
  cycles: LinearCycle[];
  projects: LinearProject[];
}> {
  const teamKeys = (process.env.LINEAR_TEAM_KEYS?.split(",") ?? ["LAB", "PLAY"]).map((key) =>
    key.trim(),
  );
  const teamKeySet = new Set(teamKeys);

  const [cyclesData, projectsData, issuesData] = await Promise.all([
    linearQuery<CyclesQueryResult>(CYCLES_QUERY),
    linearQuery<ProjectsQueryResult>(PROJECTS_QUERY),
    linearQuery<IssuesQueryResult>(ISSUES_QUERY, { teamKeys }),
  ]);

  const cycles: LinearCycle[] = [];

  for (const team of cyclesData.teams.nodes) {
    if (!teamKeySet.has(team.key)) continue;

    for (const cycle of team.cycles.nodes) {
      const issueCount = last(cycle.issueCountHistory) ?? 0;
      const completedCount = last(cycle.completedIssueCountHistory) ?? 0;
      cycles.push({
        id: cycle.id,
        number: cycle.number,
        team: team.name,
        teamKey: team.key,
        startsAt: cycle.startsAt,
        endsAt: cycle.endsAt,
        isCurrent: cycle.isActive,
        issueCount,
        completedCount,
      });
    }
  }

  const issues: LinearIssue[] = issuesData.issues.nodes.map((issue) => ({
    id: issue.id,
    identifier: issue.identifier,
    title: issue.title,
    state: issue.state.name,
    stateType: issue.state.type,
    team: issue.team.name,
    teamKey: issue.team.key,
    cycleNumber: issue.cycle?.number ?? null,
    projectName: issue.project?.name ?? null,
    priority: issue.priority,
    url: issue.url,
  }));

  const projects: LinearProject[] = projectsData.projects.nodes
    .filter((p) => p.teams.nodes.some((t) => teamKeySet.has(t.key)))
    .map((p) => ({
      id: p.id,
      name: p.name,
      teamKey: p.teams.nodes[0]?.key ?? "?",
      progress: Math.round(p.progress * 100),
      status: p.status.name,
      url: p.url,
    }));

  return { issues, cycles, projects };
}
