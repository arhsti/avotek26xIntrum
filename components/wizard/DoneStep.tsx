"use client";
import { useEffect, useState } from "react";
import type { DebtCaseRow } from "@/lib/types";
import { nok } from "@/lib/validation";
import { Badge, Button, Card, Check, ErrorBox, api, cx } from "../ui";
import type { StepProps } from "./steps";

const ERP = ["Tripletex", "Fiken", "PowerOffice Go", "Visma eAccounting", "Xledger", "24SevenOffice"];

function duration(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)} min ${s % 60} s`;
}

export function DoneStep({ o, update, onRestart }: StepProps & { onRestart: () => void }) {
  const [c, setC] = useState<DebtCaseRow | null>(null);
  const [erpLoading, setErpLoading] = useState<string | null>(null);
  const [erpResult, setErpResult] = useState<{ overdueInvoicesFound: number } | null>(null);
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
      setErpResult(await api(`/api/onboarding/${o.id}/erp`, { system }));
      const r = await api<{ onboarding: typeof o }>(`/api/onboarding/${o.id}`, undefined, "GET");
      update(r.onboarding);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setErpLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center py-4">
        <div className="mx-auto size-16 rounded-full bg-emerald-100 text-emerald-700 grid place-items-center">
          <Check className="size-9" />
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">
          {partner ? `${partner.partnerName} er koblet til Intrum` : c?.status === "manual_review" ? "Saken er mottatt" : "Saken er sendt til Intrum"}
        </h1>
        <p className="mt-2 text-ink-soft">
          Fra start til {partner ? "aktivert" : "innsendt sak"}: <b className="text-ink">{duration(elapsed)}</b>
        </p>
      </div>

      <Card className="p-5 grid sm:grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-ink-soft">Kundenummer</div>
          <div className="font-semibold text-lg">{o.customerNumber}</div>
        </div>
        {c && (
          <div>
            <div className="text-ink-soft">Saksnummer</div>
            <div className="font-semibold text-lg">{c.caseNumber}</div>
          </div>
        )}
        {c && (
          <div className="sm:col-span-2 rounded-xl bg-brand-50 p-4">
            <div className="font-medium">
              {nok(c.invoice.amount)} fra {c.debtor.name}
            </div>
            <div className="text-ink-soft">
              {c.status === "manual_review" ? "Kontrolleres av saksbehandler innen 1 virkedag." : c.nextAction}
            </div>
          </div>
        )}
        <div className="sm:col-span-2">
          <div className="font-medium mb-2">Dette skjer videre</div>
          <ol className="space-y-2 text-ink-soft">
            {(partner
              ? [
                  `Send forfalte fakturaer til inkasso direkte fra ${partner.partnerName}`,
                  `Du får bekreftelse på e-post til ${o.contact?.email}`,
                  "Følg status på alle saker i kundeportalen – du logger inn med BankID",
                ]
              : [
                  `Du får bekreftelse på e-post til ${o.contact?.email}`,
                  "Følg saken i kundeportalen – du logger inn med BankID, ingen passord å aktivere",
                  "Pengene utbetales til kontoen din når skyldner betaler",
                ]
            ).map((t, i) => (
              <li key={t} className="flex gap-3">
                <span className="size-6 shrink-0 rounded-full bg-brand-100 text-brand-700 grid place-items-center text-xs font-semibold">{i + 1}</span>
                {t}
              </li>
            ))}
          </ol>
        </div>
      </Card>

      <a href={`/portal?id=${o.id}`} className="block text-center rounded-xl bg-white ring-1 ring-black/10 px-5 py-3 font-semibold hover:bg-brand-50">
        Gå til kundeportalen
      </a>

      {partner?.returnUrl && (
        <Button className="w-full" onClick={() => (window.location.href = partner.returnUrl!)}>
          Tilbake til {partner.partnerName}
        </Button>
      )}

      {!partner && (
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-lg">Send saker automatisk fra regnskapssystemet</h2>
            <Badge>Valgfritt</Badge>
          </div>
          <p className="text-sm text-ink-soft mt-1">Koble til regnskapssystemet ditt, så kan du sende forfalte fakturaer til inkasso med ett klikk.</p>
          {o.erp ? (
            <div className="mt-4 rounded-xl bg-emerald-50 ring-1 ring-emerald-200 p-4 text-sm">
              <div className="font-medium">Koblet til {o.erp.system}</div>
              {erpResult && <div className="text-ink-soft">Vi fant {erpResult.overdueInvoicesFound} forfalte fakturaer du kan sende til inkasso.</div>}
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
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
          )}
          <div className="mt-3">
            <ErrorBox message={error} />
          </div>
        </Card>
      )}

      <div className="text-center">
        <Button variant="ghost" onClick={onRestart}>
          Start en ny demo
        </Button>
      </div>
    </div>
  );
}
