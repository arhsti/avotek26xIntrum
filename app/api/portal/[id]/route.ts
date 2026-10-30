import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { phaseOf } from "@/lib/lifecycle";
import type { DebtCase, Onboarding } from "@/lib/types";

// Prototype: «innlogging» er onboarding-ID-en. I produksjon: BankID-innlogging og tilgangsstyring.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const o = await db.get<Onboarding>("onboardings", id);
  if (!o || o.status !== "completed") return NextResponse.json({ error: "Fant ingen aktiv kunde" }, { status: 404 });
  const cases = (await db.list<DebtCase>("cases", 2000))
    .filter((c) => c.creditorOrgNr === o.orgNr && c.status !== "draft")
    .map((c) => ({ ...c, phase: phaseOf(c) }));
  return NextResponse.json(
    { customer: { name: o.company?.name, orgNr: o.orgNr, customerNumber: o.customerNumber, contact: o.contact, user: o.signer?.name, channel: o.channel?.partnerName ?? o.erp?.system ?? null }, cases },
    { headers: { "Cache-Control": "no-store" } },
  );
}
