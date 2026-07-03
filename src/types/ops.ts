export type Product = "Play" | "Workbench" | "Labs" | "Company";

export interface LinearIssue {
  id: string;
  identifier: string;
  title: string;
  state: string;
  stateType: string;
  team: string;
  teamKey: string;
  cycleNumber: number | null;
  projectName: string | null;
  priority: number;
  url: string;
}

export interface LinearCycle {
  id: string;
  number: number;
  team: string;
  teamKey: string;
  startsAt: string;
  endsAt: string;
  isCurrent: boolean;
  issueCount: number;
  completedCount: number;
}

export interface LinearProject {
  id: string;
  name: string;
  teamKey: string;
  progress: number;
  status: string;
  url: string;
}

export interface NotionNowSlot {
  slot: 1 | 2 | 3;
  status: "Empty" | "Active" | "Done" | string;
  task: string | null;
  product: string | null;
  source: string | null;
  linearUrl: string | null;
}

export interface NotionQueueItem {
  title: string;
  product: string | null;
  source: string | null;
  status: string | null;
  priority: number | null;
  linearUrl: string | null;
}

export interface NotionResumeEntry {
  product: string;
  autoSummary: string | null;
  nextInQueue: string | null;
  completedToday: string | null;
  lastShipped: string | null;
}

export interface NotionProject {
  name: string;
  product: string | null;
  linearUrl: string | null;
}

export interface OpsSnapshot {
  syncedAt: string;
  linear: {
    issues: LinearIssue[];
    cycles: LinearCycle[];
    projects: LinearProject[];
  };
  notion: {
    now: NotionNowSlot[];
    workQueue: NotionQueueItem[];
    resume: NotionResumeEntry[];
    projects: NotionProject[];
  };
  errors: string[];
}
