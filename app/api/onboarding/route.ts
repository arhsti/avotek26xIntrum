import { NextResponse } from "next/server";
import { createOnboarding } from "@/lib/onboarding";

export async function POST() {
  const o = await createOnboarding();
  return NextResponse.json(o);
}
