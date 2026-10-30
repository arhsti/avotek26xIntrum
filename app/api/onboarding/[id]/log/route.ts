import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { IntegrationLog } from "@/lib/types";

// Prototype: henter siste logg og filtrerer i minnet (god nok for demo-volum)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await db.list<IntegrationLog>("integration_log", 1000);
  return NextResponse.json(rows.filter((r) => r.onboardingId === id).reverse(), { headers: { "Cache-Control": "no-store" } });
}
