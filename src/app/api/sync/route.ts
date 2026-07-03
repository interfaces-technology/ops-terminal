import { NextResponse } from "next/server";
import { syncOpsState } from "@/lib/sync/aggregate";

export async function POST() {
  try {
    const snapshot = await syncOpsState();
    return NextResponse.json({ ok: true, syncedAt: snapshot.syncedAt, errors: snapshot.errors });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}
