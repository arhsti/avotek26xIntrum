import { NextResponse } from "next/server";
import { grantAuthorization, UserError } from "@/lib/onboarding";

export const maxDuration = 30;

// Gi fullmakt til å sende saker (signeres med BankID av en med signatur eller prokura)
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json().catch(() => ({}));
    const o = await grantAuthorization(id, body);
    return NextResponse.json(o.authorizedUsers ?? []);
  } catch (e) {
    if (e instanceof UserError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
