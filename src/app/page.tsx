import { TerminalActions } from "@/components/TerminalActions";
import { TerminalOutput } from "@/components/TerminalOutput";
import { renderDashboardSections } from "@/lib/ascii/render";
import { getOpsState } from "@/lib/sync/aggregate";
import type { TerminalDashboard } from "@/types/terminal";

export const dynamic = "force-dynamic";

function emptyDashboard(message: string): TerminalDashboard {
  return {
    header: {
      lines: [
        "",
        "  OPS TERMINAL",
        "",
        "  ⚠  No data yet. Add API keys and sync.",
        "",
        `  ${message}`,
        "",
        "  1. Copy .env.example → .env.local",
        "  2. Add LINEAR_API_KEY and NOTION_API_KEY",
        "  3. Add API keys, then refresh — sync runs automatically",
        "",
      ],
    },
    sections: [],
  };
}

export default async function Home() {
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
    <main className="flex min-h-screen flex-col items-center p-4 md:p-8">
      <div className="my-auto flex w-full flex-col items-center">
        {setupHint && (
          <p className="mb-4 max-w-full font-mono text-xs text-amber-400">{setupHint}</p>
        )}
        <TerminalOutput dashboard={dashboard} />
        <TerminalActions warnings={warnings} />
      </div>
    </main>
  );
}
