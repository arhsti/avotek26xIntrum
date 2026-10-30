"use client";
import { useState } from "react";
import type { ClaimDecision, OnboardingRow } from "@/lib/types";
import { formatAccountNumber, formatOrgNr, nok } from "@/lib/validation";
import { Badge, Button, Card, Check, ErrorBox, Spinner, api, cx } from "../ui";
import { StepHeader, type StepProps } from "./steps";

type ProgressStep = { key: string; label: string; system: string; replaces: string; status: "running" | "done" | "skipped" | "error"; ref?: string; error?: string };

export function ClaimCheckList({ check }: { check: ClaimDecision }) {
  const tone = { approved: "green", manual_review: "amber", rejected: "red" } as const;
  const label = { approved: "Godkjent automatisk", manual_review: "Manuell kontroll", rejected: "Avvist" };
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold">Kravkontroll</h2>
        <Badge tone={tone[check.decision]}>{label[check.decision]}</Badge>
      </div>
      <ul className="divide-y divide-black/5 text-sm">
        {check.checks.map((c) => (
          <li key={c.key} className="flex gap-3 py-2">
            <span
              className={cx(
                "mt-0.5 size-5 shrink-0 rounded-full grid place-items-center text-xs font-bold",
                c.status === "ok" && "bg-emerald-100 text-emerald-700",
                c.status === "warn" && "bg-amber-100 text-amber-700",
                c.status === "fail" && "bg-red-100 text-red-700",
              )}
            >
              {c.status === "ok" ? <Check className="size-3.5" /> : c.status === "warn" ? "!" : "×"}
            </span>
            <span>
              <span className="font-medium">{c.name}</span>
              <span className="block text-ink-soft">{c.detail}</span>
            </span>
          </li>
        ))}
      </ul>
      {check.decision === "manual_review" && (
        <p className="mt-2 text-xs text-ink-soft">Saken registreres nå og kontrolleres av en saksbehandler innen 1 virkedag før første brev sendes.</p>
      )}
    </div>
  );
}

function Summary({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <div className="py-3 flex justify-between gap-4">
      <div>
        <div className="text-xs uppercase tracking-wide text-ink-soft">{title}</div>
        <div className="text-sm mt-0.5">{children}</div>
      </div>
      <button onClick={onEdit} className="text-sm text-brand-700 hover:underline self-start">
        Endre
      </button>
    </div>
  );
}

export function SubmitStep({ o, draftCase, update, go }: StepProps) {
  const [progress, setProgress] = useState<ProgressStep[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const partner = o.channel;

  async function submit() {
    setRunning(true);
    setError(null);
    setProgress([]);
    try {
      const res = await fetch(`/api/onboarding/${o.id}/submit`, { method: "POST" });
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop()!;
        for (const line of lines.filter(Boolean)) {
          const ev = JSON.parse(line);
          if (ev.type === "step") {
            setProgress((p) => {
              const i = p.findIndex((x) => x.key === ev.key);
              return i === -1 ? [...p, ev] : p.map((x, j) => (j === i ? ev : x));
            });
          } else if (ev.type === "error") {
            setError(ev.message);
          } else if (ev.type === "complete") {
            await new Promise((r) => setTimeout(r, 600));
            update(await api<{ onboarding: OnboardingRow }>(`/api/onboarding/${o.id}`, undefined, "GET").then((r) => r.onboarding));
            go("done");
          }
        }
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div>
      <StepHeader
        title={partner ? `Koble ${partner.partnerName} til Intrum` : "Se over og send inn"}
        lead={partner ? `Når du aktiverer, kan du sende forfalte fakturaer til inkasso direkte fra ${partner.partnerName}.` : "Sjekk at alt stemmer. Når du sender inn, opprettes kundeforholdet og saken automatisk."}
      />

      {progress.length === 0 ? (
        <div className="space-y-5">
          <Card className="px-5 divide-y divide-black/5">
            <Summary title="Bedrift" onEdit={() => go("company")}>
              {o.company?.name} · {formatOrgNr(o.orgNr ?? "")}
            </Summary>
            <Summary title="Kontakt" onEdit={() => go("details")}>
              {o.contact?.name} · {o.contact?.email} · {o.contact?.phone}
            </Summary>
            <Summary title="Utbetaling til" onEdit={() => go("details")}>
              {formatAccountNumber(o.payout?.accountNumber ?? "")} {o.payout?.verifiedInKontoregister && <Badge tone="green">Verifisert</Badge>}
            </Summary>
            <Summary title="Avtale" onEdit={() => go("agreement")}>
              {o.agreement?.package}, signert av {o.agreement?.signedBy}
            </Summary>
            {draftCase && !partner && (
              <Summary title="Første sak" onEdit={() => go("case")}>
                {nok(draftCase.invoice.amount)} fra {draftCase.debtor.name} · faktura {draftCase.invoice.number}, forfalt{" "}
                {new Date(draftCase.invoice.dueDate).toLocaleDateString("nb-NO")}
                <span className="block text-ink-soft">{draftCase.nextAction}</span>
              </Summary>
            )}
          </Card>

          {draftCase?.claimCheck && !partner && (
            <Card className="p-5">
              <ClaimCheckList check={draftCase.claimCheck} />
            </Card>
          )}

          {partner && (
            <Card className="p-5 text-sm space-y-2">
              <div className="font-semibold">{partner.partnerName} får tilgang til å</div>
              <ul className="space-y-1.5">
                {["Sende forfalte fakturaer til inkasso på vegne av bedriften", "Hente status på sakene dine", "Motta innbetalinger og avregning"].map((t) => (
                  <li key={t} className="flex gap-2">
                    <Check className="size-4 mt-0.5 text-brand-600 shrink-0" /> {t}
                  </li>
                ))}
              </ul>
              <p className="text-ink-soft">Alle saker går gjennom samme kravkontroll. Du kan trekke tilgangen tilbake i kundeportalen.</p>
            </Card>
          )}

          <ErrorBox message={error} />
          <Button onClick={submit} loading={running} className="w-full sm:w-auto">
            {partner ? `Aktiver og gi ${partner.partnerName} tilgang` : "Send inn saken"}
          </Button>
        </div>
      ) : (
        <Card className="p-5">
          <div className="text-sm text-ink-soft mb-3">Dette skjer automatisk nå, og erstatter manuelle steg i dag:</div>
          <ul className="space-y-1">
            {progress.map((p) => (
              <li key={p.key} className="flex items-start gap-3 py-2 animate-fade-up">
                <span
                  className={cx(
                    "mt-0.5 size-6 shrink-0 rounded-full grid place-items-center",
                    p.status === "running" && "text-brand-600",
                    (p.status === "done" || p.status === "skipped") && "bg-emerald-100 text-emerald-700",
                    p.status === "error" && "bg-red-100 text-red-700",
                  )}
                >
                  {p.status === "running" ? <Spinner className="size-5" /> : p.status === "error" ? "×" : <Check className="size-4" />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{p.label}</div>
                  <div className="text-xs text-ink-soft">
                    {p.system}
                    {p.ref && ` · ${p.ref}`}
                    {p.replaces !== "—" && <span className="line-through ml-2 opacity-70">{p.replaces}</span>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {error && (
            <div className="mt-4 space-y-3">
              <ErrorBox message={error} />
              <Button onClick={submit} loading={running}>
                Prøv igjen
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
