import { getPartnerCase } from "@/lib/partners";
import { handle } from "@/lib/partnerHandle";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(req, (p) => getPartnerCase(p, id));
}
