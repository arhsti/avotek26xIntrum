import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { addMessage, advanceCase } from "@/lib/lifecycle";
import type { DebtCase, Onboarding } from "@/lib/types";

type Ctx = { params: Promise<{ id: string; caseId: string; action: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const { id, caseId, action } = await params;
  const [o, c] = await Promise.all([db.get<Onboarding>("onboardings", id), db.get<DebtCase>("cases", caseId)]);
  if (!o || !c || c.creditorOrgNr !== o.orgNr) return NextResponse.json({ error: "Fant ikke saken" }, { status: 404 });

  if (action === "advance") return NextResponse.json(await advanceCase(caseId));
  if (action === "messages") {
    const { text } = await req.json().catch(() => ({ text: "" }));
    if (!String(text ?? "").trim()) return NextResponse.json({ error: "Skriv en melding" }, { status: 400 });
    return NextResponse.json(await addMessage(caseId, String(text).trim().slice(0, 2000)));
  }
  return NextResponse.json({ error: "Ukjent handling" }, { status: 404 });
}
