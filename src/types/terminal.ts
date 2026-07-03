export interface LineProgress {
  ratio: number;
  width: number;
  prefix: string;
  suffix: string;
}

export interface LinkedLine {
  text: string;
  href?: string;
  progress?: LineProgress;
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
