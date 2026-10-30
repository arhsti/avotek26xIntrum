import { getConnection } from "@/lib/partners";
import { handle } from "@/lib/partnerHandle";

export async function GET(req: Request) {
  const orgNr = new URL(req.url).searchParams.get("orgNr") ?? "";
  return handle(req, (p) => getConnection(p, orgNr));
}
