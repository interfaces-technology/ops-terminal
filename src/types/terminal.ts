export interface LineProgress {
  ratio: number;
  label: string;
  pct: number | null;
  status: string;
  /** Overrides the % column (e.g. domain active count). */
  pctColumn?: string;
}

export interface LinkedLine {
  text: string;
  href?: string;
  progress?: LineProgress;
  /** Right-aligned text (counts, status) without a progress bar. */
  trail?: string;
  /** When set with href, only this span is clickable (usually the project name). */
  linkText?: string;
  linkPrefix?: string;
  linkSuffix?: string;
}

export interface TerminalSection {
  title: string;
  lines: LinkedLine[];
}

export interface TerminalHeader {
  lines: string[];
}

export interface TerminalDashboard {
  header: TerminalHeader;
  sections: TerminalSection[];
}
