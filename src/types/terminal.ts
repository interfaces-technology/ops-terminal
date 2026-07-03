export interface LinkedLine {
  text: string;
  href?: string;
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
