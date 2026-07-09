export type Product = "Play" | "Workbench" | "Labs" | "Company";

export interface NotionFocusSlot {
  slot: 1 | 2 | 3;
  label: string;
  area: string | null;
  url: string | null;
  status: string | null;
  progress: number | null;
  kind: "milestone" | "sprint";
}

export interface NotionMilestone {
  name: string;
  status: string;
  product: string | null;
  url: string;
  targetDate: string | null;
  progress: number | null;
}

export interface NotionSprint {
  name: string;
  status: string;
  url: string;
  startDate: string | null;
  endDate: string | null;
  progress: number | null;
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
  focus: NotionFocus;
  horizon: NotionHorizonItem[];
  notionProjects: NotionProject[];
  shipLog: NotionShipLogEntry[];
  errors: string[];
}
