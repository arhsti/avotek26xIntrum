import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Nullstill demodata (beskyttes av ADMIN_PASSWORD via middleware når satt)
export async function POST() {
  await Promise.all((["onboardings", "cases", "integration_log", "funnel_events"] as const).map((c) => db.clear(c)));
  return NextResponse.json({ ok: true });
}
