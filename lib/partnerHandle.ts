import { NextResponse } from "next/server";
import { authPartner, PartnerError } from "@/lib/partners";
import type { Partner } from "@/lib/types";

export async function handle(req: Request, fn: (partner: Partner) => Promise<unknown>, status = 200) {
  try {
    const partner = authPartner(req);
    return NextResponse.json(await fn(partner), { status });
  } catch (e) {
    if (e instanceof PartnerError) return NextResponse.json({ error: e.message, details: e.details }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Intern feil" }, { status: 500 });
  }
}
