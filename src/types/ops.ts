export type Product =
  | "Company"
  | "Studio"
  | "Lab"
  | "Play"
  | "Workbench"
  | "Labs"
  | "Partnerships";

export type TaskSpace = "company" | "studio" | "lab" | "play" | "workbench";

export interface NotionTask {
  name: string;
  status: string;
  type: string | null;
  product: string | null;
  url: string;
  priority: string | null;
  repo: string | null;
  pr: string | null;
  prStatus: string | null;
  branch: string | null;
  implementationSummary: string | null;
  testResults: string | null;
  nextAction: string | null;
  lastSyncedAt: string | null;
  agentPrompt: string | null;
  space: TaskSpace;
}

export interface NotionMilestone {
  name: string;
  status: string;
  product: string | null;
  url: string;
  targetDate: string | null;
  horizonUrl: string | null;
}

export interface NotionHorizonItem {
  aim: string;
  area: string | null;
  target: string | null;
  url: string | null;
  /** Optional link from Notion (often a former Linear initiative URL). */
  linkUrl: string | null;
}

export interface NotionProject {
  name: string;
  product: string | null;
  area: string | null;
  phase: string | null;
  status: string | null;
  outcome: string | null;
  url: string | null;
  /** Optional link from Notion (often a former Linear project URL). */
  linkUrl: string | null;
  priority: string | null;
  target: string | null;
  progress: number | null;
}

export interface NotionShipLogEntry {
  title: string;
  product: string | null;
  date: string | null;
  summary: string | null;
  /** Optional link from Notion (often a former Linear URL). */
  linkUrl: string | null;
}

export interface OpsSnapshot {
  syncedAt: string;
  today: NotionTask[];
  horizon: NotionHorizonItem[];
  milestones: NotionMilestone[];
  notionProjects: NotionProject[];
  tasks: NotionTask[];
  shipLog: NotionShipLogEntry[];
  errors: string[];
}
