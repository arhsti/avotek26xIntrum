import type { Metadata } from "next";
import { db } from "@/lib/db";
import { systemForLog, type SystemId } from "@/lib/dataflow";
import type { DebtCase, IntegrationLog, Onboarding } from "@/lib/types";
import { DataFlowMap, type LiveCall, type LiveOnboarding } from "./DataFlowMap";

export const metadata: Metadata = { title: "Dataflyt – Intrum (prototype)" };
export const dynamic = "force-dynamic";

// Det som i praksis går til Pink for en kunde: klient + saker (bygget fra prototypens data)
function pinkPayload(o: Onboarding & { id: string }, cases: DebtCase[]) {
  return {
    klient: {
      kundenummer: o.customerNumber,
      orgNr: o.orgNr,
      navn: o.company?.name,
      adresse: o.company?.address,
      utbetalingskonto: o.payout?.accountNumber,
      avtale: o.agreement ? { produkt: o.agreement.package, signert: o.agreement.signedAt, signertAv: o.agreement.signedBy } : null,
      kontakt: o.contact,
      kanSendeSaker: o.authorizedUsers?.map((u) => `${u.name} (${u.source === "brreg" ? "Brønnøysund" : "fullmakt"})`),
    },
    saker: cases.map((c) => ({
      saksnummer: c.caseNumber,
      kanal: c.channel === "web" || !c.channel ? "skjema" : c.channel,
      typeKrav: c.claimType ?? "faktura",
      dinReferanse: c.reference ?? c.externalId,
      skyldner: c.debtor,
      faktura: c.invoice,
      innbetalinger: c.payments ?? [],
      utestaende: c.outstanding ?? c.invoice.amount,
      inkassovarsel: c.reminderAlreadySent ? c.notice ?? "sendt av kreditor" : "sendes av Intrum",
      vedlegg: c.attachments ?? [],
      omtvistet: Boolean(c.disputed),
      kravkontroll: c.claimCheck?.decision,
      status: c.status,
    })),
  };
}

export default async function Page() {
  const [onboardings, cases, logs] = await Promise.all([
    db.list<Onboarding>("onboardings", 200),
    db.list<DebtCase>("cases", 2000),
    db.list<IntegrationLog>("integration_log", 3000),
  ]);

  const live: LiveOnboarding[] = onboardings
    .filter((o) => o.status === "completed")
    .slice(0, 25)
    .map((o) => {
      const calls: Partial<Record<SystemId, LiveCall[]>> = {};
      for (const l of logs.filter((x) => x.onboardingId === o.id).reverse()) {
        const sys = systemForLog(l.system, l.action);
        if (!sys) continue;
        (calls[sys] ??= []).push({ at: l.createdAt, action: `${l.system}: ${l.action}`, request: l.request, response: l.response, status: l.status });
      }
      const own = cases.filter((c) => c.creditorOrgNr === o.orgNr && c.status !== "draft");
      return {
        id: o.id,
        label: `${o.company?.name ?? "Ukjent"} · ${o.channel?.partnerName ?? "intrum.no"} · ${new Date(o.startedAt).toLocaleString("nb-NO", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`,
        calls,
        pinkPayload: pinkPayload(o, own),
      };
    });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dataflyt</h1>
        <p className="mt-2 text-ink-soft max-w-3xl">
          Hvilke data fra skjemaet og ERP-et som går til hvilket system, via MuleSoft, og i hvilken fase av prosesskartet. Pink har ikke API i dag –
          dataene til Pink går via en adapter som må bygges.
        </p>
      </div>
      <DataFlowMap live={live} />
    </div>
  );
}
