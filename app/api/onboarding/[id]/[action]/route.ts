import { NextResponse } from "next/server";
import * as svc from "@/lib/onboarding";
import { IntegrationError } from "@/lib/integrations";
import type { StepKey } from "@/lib/types";

export const maxDuration = 30;

type Ctx = { params: Promise<{ id: string; action: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const { id, action } = await params;
  try {
    if (action === "ocr") {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) throw new svc.UserError("Last opp en fil");
      if (file.size > 10 * 1024 * 1024) throw new svc.UserError("Filen er for stor (maks 10 MB)");
      return NextResponse.json(await svc.ocr(id, file.name, file.size));
    }

    const body = await req.json().catch(() => ({}));
    switch (action) {
      case "company":
        return NextResponse.json(await svc.setCompany(id, body.orgNr));
      case "identify":
        return NextResponse.json(await svc.identify(id, body.personId));
      case "accounts":
        return NextResponse.json({ accounts: await svc.suggestedAccounts(id) });
      case "details":
        return NextResponse.json(await svc.setDetails(id, body));
      case "sign":
        return NextResponse.json(await svc.signAgreement(id));
      case "debtor":
        return NextResponse.json(await svc.lookupDebtor(id, String(body.orgNr ?? "").replace(/\D/g, "")));
      case "case":
        return NextResponse.json(await svc.saveCase(id, body));
      case "step":
        return NextResponse.json(await svc.goToStep(id, body.step as StepKey));
      case "erp":
        return NextResponse.json(await svc.connectErp(id, body.system));
      default:
        return NextResponse.json({ error: "Ukjent handling" }, { status: 404 });
    }
  } catch (e) {
    if (e instanceof svc.UserError) return NextResponse.json({ error: e.message }, { status: 400 });
    if (e instanceof IntegrationError) return NextResponse.json({ error: e.message, system: e.system }, { status: 502 });
    console.error(e);
    return NextResponse.json({ error: "Noe gikk galt. Prøv igjen." }, { status: 500 });
  }
}
