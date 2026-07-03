import { RefreshButton } from "@/components/RefreshButton";
import { renderDashboard } from "@/lib/ascii/render";
import { getOpsState } from "@/lib/sync/aggregate";

export const dynamic = "force-dynamic";

export default async function Home() {
  let output: string;
  let setupHint: string | null = null;

  try {
    const snapshot = await getOpsState(false);
    output = renderDashboard(snapshot);
    if (snapshot.errors.length > 0 && snapshot.linear.issues.length === 0) {
      setupHint = "Partial sync — check API keys in .env.local";
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load";
    setupHint = message;
    output = [
      "",
      "  INTERFACES COMPANY · OPS TERMINAL",
      "",
      "  ⚠  No data yet. Add API keys and sync.",
      "",
      `  ${message}`,
      "",
      "  1. Copy .env.example → .env.local",
      "  2. Add LINEAR_API_KEY and NOTION_API_KEY",
      "  3. Click [ sync ] or POST /api/sync",
      "",
    ].join("\n");
  }

  return (
    <main className="min-h-screen p-4 md:p-8">
      {setupHint && (
        <p className="mb-4 font-mono text-xs text-amber-400">{setupHint}</p>
      )}
      <pre className="overflow-x-auto whitespace-pre font-mono text-sm leading-relaxed text-green-400 selection:bg-green-900">
        {output}
      </pre>
      <RefreshButton />
    </main>
  );
}
