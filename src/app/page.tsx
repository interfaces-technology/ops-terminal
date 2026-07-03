import { TerminalAuth } from "@/components/TerminalAuth";
import { TerminalGate } from "@/components/TerminalGate";
import { TerminalOutput } from "@/components/TerminalOutput";
import { isAuthenticated } from "@/lib/auth-server";
import { renderDashboardSections } from "@/lib/ascii/render";
import { getOpsState } from "@/lib/sync/aggregate";
import type { TerminalDashboard } from "@/types/terminal";

export const dynamic = "force-dynamic";

function emptyDashboard(message: string): TerminalDashboard {
  return {
    header: {
      lines: [
        "",
        "OPS TERMINAL",
        "",
        "⚠  No data yet. Add API keys and sync.",
        "",
        message,
        "",
        "1. Copy .env.example → .env.local",
        "2. Add LINEAR_API_KEY and NOTION_API_KEY",
        "3. Add API keys, then refresh — sync runs automatically",
        "",
      ],
    },
    sections: [],
  };
}

export default async function Home() {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    return <TerminalAuth />;
  }

  let dashboard: TerminalDashboard;
  let setupHint: string | null = null;
  let warnings: string[] = [];

  try {
    const snapshot = await getOpsState(false);
    warnings = snapshot.errors;
    dashboard = renderDashboardSections(snapshot);
    if (snapshot.errors.length > 0 && snapshot.linear.issues.length === 0) {
      setupHint = "Partial sync — check API keys in .env.local";
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load";
    setupHint = message;
    dashboard = emptyDashboard(message);
  }

  return (
    <TerminalGate>
      <main className="terminal-shell flex w-full flex-col items-center">
        <div className="flex w-full flex-col items-center">
          <TerminalOutput
            dashboard={dashboard}
            setupHint={setupHint}
            warnings={warnings}
          />
        </div>
      </main>
    </TerminalGate>
  );
}
