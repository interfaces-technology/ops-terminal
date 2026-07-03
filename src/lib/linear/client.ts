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

  if (!res.ok) {
    throw new Error(`Linear API error: ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as GraphQLResponse<T>;
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join("; "));
  }
  if (!json.data) {
    throw new Error("Linear API returned no data");
  }
  return json.data;
}

const TEAMS_QUERY = `
  query TeamsAndProjects {
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
            isCurrent
            issueCountHistory
            completedIssueCountHistory
          }
        }
        issues(first: 250, filter: { state: { type: { nin: ["canceled", "duplicate"] } } }) {
          nodes {
            id
            identifier
            title
            priority
            url
            state { name type }
            cycle { number }
            project { name }
            assignee { name }
          }
        }
      }
    }
    projects(first: 50, filter: { accessible: true }) {
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

interface TeamsQueryResult {
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
          isCurrent: boolean;
          issueCountHistory: number[];
          completedIssueCountHistory: number[];
        }>;
      };
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
          assignee: { name: string } | null;
        }>;
      };
    }>;
  };
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

function last<T>(arr: T[]): T | undefined {
  return arr.length > 0 ? arr[arr.length - 1] : undefined;
}

export async function fetchLinearData(): Promise<{
  issues: LinearIssue[];
  cycles: LinearCycle[];
  projects: LinearProject[];
}> {
  const data = await linearQuery<TeamsQueryResult>(TEAMS_QUERY);
  const teamKeys = new Set<string>(process.env.LINEAR_TEAM_KEYS?.split(",") ?? ["LAB", "PLAY"]);

  const issues: LinearIssue[] = [];
  const cycles: LinearCycle[] = [];

  for (const team of data.teams.nodes) {
    if (!teamKeys.has(team.key)) continue;

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
        isCurrent: cycle.isCurrent,
        issueCount,
        completedCount,
      });
    }

    for (const issue of team.issues.nodes) {
      issues.push({
        id: issue.id,
        identifier: issue.identifier,
        title: issue.title,
        state: issue.state.name,
        stateType: issue.state.type,
        team: team.name,
        teamKey: team.key,
        cycleNumber: issue.cycle?.number ?? null,
        projectName: issue.project?.name ?? null,
        priority: issue.priority,
        url: issue.url,
      });
    }
  }

  const projects: LinearProject[] = data.projects.nodes
    .filter((p) => p.teams.nodes.some((t) => teamKeys.has(t.key)))
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
