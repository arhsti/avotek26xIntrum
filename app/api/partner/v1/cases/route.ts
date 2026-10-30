import { NextResponse } from "next/server";
import { authPartner, createPartnerCase, listPartnerCases, PartnerError } from "@/lib/partners";
import { handle } from "@/lib/partnerHandle";

// Statussynk: ERP henter status på alle saker for en kreditor
export async function GET(req: Request) {
  const orgNr = new URL(req.url).searchParams.get("creditorOrgNr") ?? "";
  return handle(req, (p) => listPartnerCases(p, orgNr));
}

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const partner = authPartner(req);
    const body = await req.json().catch(() => ({}));
    const { created, case: c } = await createPartnerCase(partner, body);
    const status = c.status === "rejected" ? 422 : created ? 201 : 200;
    return NextResponse.json(c, { status });
  } catch (e) {
    if (e instanceof PartnerError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Intern feil" }, { status: 500 });
  }
}
