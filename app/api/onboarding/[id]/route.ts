import { NextResponse } from "next/server";
import { getCase, getOnboarding, UserError } from "@/lib/onboarding";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const onboarding = await getOnboarding(id);
    const draftCase = onboarding.draftCaseId ? await getCase(onboarding.draftCaseId) : null;
    return NextResponse.json({ onboarding, draftCase });
  } catch (e) {
    if (e instanceof UserError) return NextResponse.json({ error: e.message }, { status: 404 });
    throw e;
  }
}
