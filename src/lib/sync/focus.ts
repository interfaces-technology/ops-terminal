import type {
  LinearMilestone,
  NotionFocusSlot,
  NotionMilestone,
  NotionSprint,
} from "@/types/ops";

const NO_DATE = Number.POSITIVE_INFINITY;

const CANCELED_LABEL = /\b(cancel(?:led|ed)?|superseded|parked|abandon(?:ed)?)\b/i;
const CANCELED_STATUS = /cancel|parked|superseded|abandon/i;

/** Drop done, canceled, superseded, or parked items from Focus slots. */
export function isEligibleForFocus(input: {
  name: string;
  status: string | null;
  projectStatus?: string | null;
}): boolean {
  const status = input.status?.toLowerCase() ?? "";
  if (status === "done") return false;
  if (input.status && CANCELED_STATUS.test(input.status)) return false;
  if (CANCELED_LABEL.test(input.name)) return false;
  if (input.projectStatus && CANCELED_STATUS.test(input.projectStatus)) return false;
  return true;
}

type FocusSource = "linear-milestone" | "notion-milestone" | "notion-sprint";

interface FocusCandidate {
  source: FocusSource;
  label: string;
  area: string | null;
  url: string | null;
  status: string;
  progress: number | null;
  targetDate: string | null;
}

const SOURCE_TIEBREAK: Record<FocusSource, number> = {
  "notion-sprint": 0,
  "linear-milestone": 1,
  "notion-milestone": 2,
};

function urgencyRank(candidate: FocusCandidate): number {
  if (candidate.source === "notion-sprint") {
    switch (candidate.status) {
      case "Current":
        return 0;
      case "Next":
        return 2;
      case "Future":
        return 4;
      default:
        return 9;
    }
  }

  if (candidate.source === "linear-milestone") {
    switch (candidate.status) {
      case "overdue":
        return 1;
      case "next":
        return 2;
      case "unstarted":
        return 4;
      default:
        return 5;
    }
  }

  switch (candidate.status) {
    case "In progress":
      return 2;
    case "Not started":
      return 4;
    default:
      return 5;
  }
}

function compareCandidates(a: FocusCandidate, b: FocusCandidate): number {
  const urgency = urgencyRank(a) - urgencyRank(b);
  if (urgency !== 0) return urgency;

  const sourceOrder = SOURCE_TIEBREAK[a.source] - SOURCE_TIEBREAK[b.source];
  if (sourceOrder !== 0) return sourceOrder;

  const dateA = a.targetDate ? Date.parse(a.targetDate) : NO_DATE;
  const dateB = b.targetDate ? Date.parse(b.targetDate) : NO_DATE;
  if (dateA !== dateB) return dateA - dateB;

  return a.label.localeCompare(b.label);
}

function toLinearMilestoneCandidate(milestone: LinearMilestone): FocusCandidate {
  return {
    source: "linear-milestone",
    label: milestone.name,
    area: milestone.teamKey,
    url: milestone.projectUrl,
    status: milestone.status,
    progress: milestone.progress,
    targetDate: milestone.targetDate,
  };
}

function toNotionMilestoneCandidate(milestone: NotionMilestone): FocusCandidate {
  return {
    source: "notion-milestone",
    label: milestone.name,
    area: milestone.product,
    url: milestone.url,
    status: milestone.status,
    progress: milestone.progress,
    targetDate: milestone.targetDate,
  };
}

function toSprintCandidate(sprint: NotionSprint): FocusCandidate {
  return {
    source: "notion-sprint",
    label: sprint.name,
    area: "sprint",
    url: sprint.url,
    status: sprint.status,
    progress: sprint.progress,
    targetDate: sprint.endDate ?? sprint.startDate,
  };
}

export function rankFocusCandidates(
  linearMilestones: LinearMilestone[],
  notionMilestones: NotionMilestone[],
  notionSprints: NotionSprint[],
): FocusCandidate[] {
  const candidates: FocusCandidate[] = [
    ...linearMilestones.map(toLinearMilestoneCandidate),
    ...notionMilestones.map(toNotionMilestoneCandidate),
    ...notionSprints.map(toSprintCandidate),
  ].filter((candidate) => isEligibleForFocus({ name: candidate.label, status: candidate.status }));

  return candidates.sort(compareCandidates);
}

export function buildFocusSlots(
  linearMilestones: LinearMilestone[],
  notionMilestones: NotionMilestone[],
  notionSprints: NotionSprint[],
): NotionFocusSlot[] {
  return rankFocusCandidates(linearMilestones, notionMilestones, notionSprints)
    .slice(0, 3)
    .map((candidate, index) => ({
      slot: (index + 1) as 1 | 2 | 3,
      label: candidate.label,
      area: candidate.area,
      url: candidate.url,
      linearIdentifier: null,
      linearState: candidate.status,
      progress: candidate.progress,
      kind: candidate.source === "notion-sprint" ? "sprint" : "milestone",
    }));
}
