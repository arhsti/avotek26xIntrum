"use client";
import { useEffect, useState } from "react";
import type { DebtCaseRow } from "@/lib/types";
import { caseTimeline } from "@/lib/timeline";
import { nok } from "@/lib/validation";
import { CaseTimeline } from "../CaseTimeline";
import { Button, Card, Check, ErrorBox, api, cx } from "../ui";
import type { StepProps } from "./steps";

// Integrasjoner Intrum har i dag, pluss Fiken som mulig ny partner
const ERP = ["Tripletex", "PowerOffice Go", "Visma", "Xledger", "24SevenOffice", "Fiken"];

function duration(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  return s < 60 ? `${s} sekunder` : `${Math.floor(s / 60)} min ${s % 60} s`;
}

export function DoneStep({ o, update, onRestart }: StepProps & { onRestart: () => void }) {
  const [c, setC] = useState<DebtCaseRow | null>(null);
  const [showErp, setShowErp] = useState(false);
  const [erpLoading, setErpLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const elapsed = o.completedAt ? new Date(o.completedAt).getTime() - new Date(o.startedAt).getTime() : 0;
  const partner = o.channel;

  useEffect(() => {
    if (o.firstCaseId) api<{ draftCase: DebtCaseRow }>(`/api/onboarding/${o.id}`, undefined, "GET").then((r) => setC(r.draftCase));
  }, [o.id, o.firstCaseId]);

  async function connect(system: string) {
    setErpLoading(system);
    setError(null);
    try {
      await api(`/api/onboarding/${o.id}/erp`, { system });
      update((await api<{ onboarding: typeof o }>(`/api/onboarding/${o.id}`, undefined, "GET")).onboarding);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setErpLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center py-2">
        <div className="mx-auto size-14 rounded-full bg-emerald-100 text-emerald-700 grid place-items-center">
          <Check className="size-8" />
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">
          {partner ? `${partner.partnerName} er koblet til Intrum` : c?.status === "manual_review" ? "Saken er mottatt" : "Saken er hos Intrum"}
        </h1>
        <p className="mt-2 text-ink-soft">
          {c ? `${nok(c.outstanding ?? c.invoice.amount)} fra ${c.debtor.name} · sak ${c.caseNumber}` : `Kundenummer ${o.customerNumber}`} · ferdig på {duration(elapsed)}
        </p>
      </div>

      {o.profile?.segment === "advisor" && (
        <div className="rounded-xl bg-brand-50 p-4 text-sm">En rådgiver kontakter deg innen 1 virkedag for å sette opp det dere trenger.</div>
      )}

      {c && (
        <Card className="p-5">
          <h2 className="font-semibold mb-4">Dette skjer videre</h2>
          <CaseTimeline steps={caseTimeline(c)} />
        </Card>
      )}

      {partner && (
        <Card className="p-5 text-sm">
          Send forfalte fakturaer til inkasso fra {partner.partnerName}. Du følger sakene i kundeportalen, og status vises i {partner.partnerName}.
        </Card>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        <a href={`/portal?id=${o.id}`} className="block text-center rounded-xl bg-brand-600 text-white px-5 py-3 font-semibold hover:bg-brand-700">
          Følg saken i kundeportalen
        </a>
        {partner?.returnUrl ? (
          <Button variant="secondary" onClick={() => (window.location.href = partner.returnUrl!)}>
            Tilbake til {partner.partnerName}
          </Button>
        ) : (
          <Button variant="secondary" onClick={() => setShowErp(!showErp)}>
            {o.erp ? `Koblet til ${o.erp.system}` : "Send saker fra regnskapssystemet"}
          </Button>
        )}
      </div>

      {!partner && showErp && !o.erp && (
        <Card className="p-5 animate-fade-up">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ERP.map((s) => (
              <button
                key={s}
                onClick={() => connect(s)}
                disabled={Boolean(erpLoading)}
                className={cx("rounded-xl ring-1 ring-black/10 px-3 py-3 text-sm font-medium hover:ring-brand-400 hover:bg-brand-50 disabled:opacity-50", erpLoading === s && "animate-pulse")}
              >
                {erpLoading === s ? "Kobler til …" : s}
              </button>
            ))}
          </div>
          <div className="mt-3">
            <ErrorBox message={error} />
          </div>
        </Card>
      )}
      {o.erp && !partner && (
        <p className="text-sm text-ink-soft text-center">Koblet til {o.erp.system}. Nå kan du sende forfalte fakturaer derfra.</p>
      )}

      <div className="text-center">
        <Button variant="ghost" onClick={onRestart}>
          Start en ny demo
        </Button>
      </div>
    </div>
  );
}
