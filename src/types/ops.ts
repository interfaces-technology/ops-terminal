export type Product = "Play" | "Workbench" | "Labs" | "Company";

export interface LinearIssue {
  id: string;
  identifier: string;
  title: string;
  state: string;
  stateType: string;
  team: string;
  teamKey: string;
  milestoneName: string | null;
  projectName: string | null;
  priority: number;
  url: string;
}

export interface LinearProject {
  id: string;
  name: string;
  teamKey: string;
  progress: number;
  status: string;
  url: string;
}

export interface LinearTeamStats {
  teamKey: string;
  todo: number;
  inProgress: number;
  done: number;
}

export interface NotionFocusSlot {
  slot: 1 | 2 | 3;
  label: string;
  area: string | null;
  url: string | null;
  linearIdentifier: string | null;
  linearState: string | null;
}

export interface NotionFocus {
  slots: NotionFocusSlot[];
  lastSession: string | null;
  notes: string | null;
  thisWeek: string | null;
}

export interface NotionHorizonItem {
  aim: string;
  area: string | null;
  target: string | null;
  linearInitiativeUrl: string | null;
}

export interface NotionProject {
  name: string;
  product: string | null;
  phase: string | null;
  outcome: string | null;
  linearUrl: string | null;
}

export interface NotionShipLogEntry {
  title: string;
  product: string | null;
  date: string | null;
  summary: string | null;
  linearUrl: string | null;
}

export interface OpsSnapshot {
  syncedAt: string;
  focus: NotionFocus;
  horizon: NotionHorizonItem[];
  notionProjects: NotionProject[];
  shipLog: NotionShipLogEntry[];
  linear: {
    issues: LinearIssue[];
    projects: LinearProject[];
    byTeam: LinearTeamStats[];
  };
  errors: string[];
}
