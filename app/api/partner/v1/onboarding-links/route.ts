import { createOnboardingLink } from "@/lib/partners";
import { handle } from "@/lib/partnerHandle";

export const maxDuration = 30;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  return handle(req, (p) => createOnboardingLink(p, new URL(req.url).origin, body), 201);
}
