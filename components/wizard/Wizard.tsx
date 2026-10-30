"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { STEPS, STEP_LABELS, type DebtCaseRow, type OnboardingRow, type StepKey } from "@/lib/types";
import { formatOrgNr } from "@/lib/validation";
import { Badge, Card, Check, Spinner, api, cx } from "../ui";
import { AgreementStep, CompanyStep, DetailsStep, IdentityStep, type StepProps } from "./steps";
import { CaseStep } from "./CaseStep";
import { SubmitStep } from "./SubmitStep";
import { DoneStep } from "./DoneStep";

const STORAGE_KEY = "intrum-onboarding-id";
// Siste fullførte kunde – brukes av kundeportalen
const PORTAL_KEY = "intrum-portal-id";

function storage(action: "get" | "set" | "remove", value?: string, key = STORAGE_KEY) {
  try {
    if (action === "get") return localStorage.getItem(key);
    if (action === "set") localStorage.setItem(key, value!);
    else localStorage.removeItem(key);
  } catch {}
  return null;
}

export function Wizard() {
  const [o, setO] = useState<OnboardingRow | null>(null);
  const [draftCase, setDraftCase] = useState<DebtCaseRow | null>(null);
  const [view, setView] = useState<StepKey>("company");

  // Brukeren kan navigere bort mens registreringen lastes – da skal vi ikke røre adressen
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const start = useCallback(async (fresh = false) => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("id");
    const id = fresh || params.has("ny") ? null : fromUrl ?? storage("get");
    type Loaded = { onboarding: OnboardingRow; draftCase: DebtCaseRow | null };
    let loaded: Loaded | null = null;
    if (id) loaded = await api<Loaded>(`/api/onboarding/${id}`, undefined, "GET").catch(() => null);
    // En fullført registrering lagret i nettleseren gir ny registrering – bare uferdige fortsetter
    if (loaded && !fromUrl && loaded.onboarding.status === "completed") loaded = null;
    if (!loaded) loaded = { onboarding: await api<OnboardingRow>("/api/onboarding"), draftCase: null };
    const ob = loaded!.onboarding;
    storage("set", ob.id);
    if (!mounted.current || window.location.pathname !== "/onboarding") return;
    window.history.replaceState(null, "", `/onboarding?id=${ob.id}`);
    setO(ob);
    setDraftCase(loaded!.draftCase);
    setView(ob.step);
  }, []);

  useEffect(() => {
    start();
  }, [start]);

  const go = useCallback(
    (s: StepKey) => {
      setView(s);
      window.scrollTo({ top: 0, behavior: "smooth" });
      if (o && STEPS.indexOf(s) > STEPS.indexOf(o.step)) {
        api<OnboardingRow>(`/api/onboarding/${o.id}/step`, { step: s }).then(setO).catch(() => {});
      }
    },
    [o],
  );

  useEffect(() => {
    if (o?.status === "completed") storage("set", o.id, PORTAL_KEY);
  }, [o?.id, o?.status]);

  if (!o) {
    return (
      <div className="grid place-items-center py-32 text-brand-600">
        <Spinner className="size-8" />
      </div>
    );
  }

  const partner = o.channel;
  const visibleSteps = STEPS.filter((s) => s !== "done" && !(partner && s === "case"));
  const props: StepProps = { o, draftCase, update: setO, setDraftCase, go };
  const reached = STEPS.indexOf(o.step);
  const completed = o.status === "completed";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 grid lg:grid-cols-[1fr_340px] gap-8">
      <div className="min-w-0">
        {partner && (
          <div className="mb-4 rounded-xl bg-white ring-1 ring-black/5 px-4 py-3 text-sm flex items-center gap-2">
            <Badge>Fra {partner.partnerName}</Badge>
            <span className="text-ink-soft">Du aktiverer inkasso fra {partner.partnerName}. Bedriften er allerede fylt ut.</span>
          </div>
        )}
        {view !== "done" && (
          <ol className="mb-8 flex gap-1.5" aria-label="Fremdrift">
            {visibleSteps.map((s, i) => {
              const idx = STEPS.indexOf(s);
              const isDone = idx < reached && s !== view;
              const clickable = idx <= reached && !completed;
              return (
                <li key={s} className="flex-1 min-w-0">
                  <button disabled={!clickable} onClick={() => go(s)} className="w-full text-left group disabled:cursor-default">
                    <div className={cx("h-1.5 rounded-full", s === view ? "bg-brand-600" : isDone ? "bg-brand-400" : "bg-black/10")} />
                    <div className={cx("mt-2 text-xs truncate hidden sm:block", s === view ? "font-semibold text-ink" : "text-ink-soft", clickable && "group-hover:text-ink")}>
                      {i + 1}. {STEP_LABELS[s]}
                    </div>
                  </button>
                </li>
              );
            })}
          </ol>
        )}
        <div key={view} className="animate-fade-up">
          {view === "company" && <CompanyStep {...props} />}
          {view === "identity" && <IdentityStep {...props} />}
          {view === "details" && <DetailsStep {...props} />}
          {view === "agreement" && <AgreementStep {...props} />}
          {view === "case" && <CaseStep {...props} />}
          {view === "submit" && <SubmitStep {...props} />}
          {view === "done" && (
            <DoneStep
              {...props}
              onRestart={() => {
                storage("remove");
                setO(null);
                start(true);
              }}
            />
          )}
        </div>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-6 self-start">
        <Card className="p-5 text-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Din registrering</h2>
            <Timer startedAt={o.startedAt} stoppedAt={o.completedAt} />
          </div>
          <ul className="mt-3 space-y-2.5">
            <SideItem done={Boolean(o.company)} label="Bedrift" value={o.company && `${o.company.name} (${formatOrgNr(o.company.orgNr)})`} />
            <SideItem done={Boolean(o.signer)} label="Identifisert" value={o.signer?.name} />
            <SideItem done={Boolean(o.kyc)} label="Kundekontroll" value={o.kyc && "Godkjent"} />
            <SideItem done={Boolean(o.payout)} label="Utbetalingskonto" value={o.payout && "Verifisert i Kontoregisteret"} />
            <SideItem done={Boolean(o.agreement)} label="Avtale" value={o.agreement && `Signert av ${o.agreement.signedBy}`} />
            {!partner && <SideItem done={Boolean(o.firstCaseId)} label="Første sak" value={o.firstCaseId ? "Sendt" : draftCase ? "Klar til innsending" : undefined} />}
            {partner && <SideItem done={Boolean(o.partnerConnection)} label={`Tilgang for ${partner.partnerName}`} value={o.partnerConnection && "Aktiv"} />}
          </ul>
        </Card>
      </aside>
    </div>
  );
}

function SideItem({ done, label, value }: { done: boolean; label: string; value?: string | false | null }) {
  return (
    <li className="flex gap-2.5">
      <span className={cx("mt-0.5 size-5 shrink-0 rounded-full grid place-items-center", done ? "bg-emerald-100 text-emerald-700" : "ring-1 ring-black/15")}>
        {done && <Check className="size-3.5" />}
      </span>
      <span className="min-w-0">
        <span className={cx("block", !done && "text-ink-soft")}>{label}</span>
        {value && <span className="block text-xs text-ink-soft truncate">{value}</span>}
      </span>
    </li>
  );
}

function Timer({ startedAt, stoppedAt }: { startedAt: string; stoppedAt?: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (stoppedAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [stoppedAt]);
  const s = Math.max(0, Math.round(((stoppedAt ? new Date(stoppedAt).getTime() : now) - new Date(startedAt).getTime()) / 1000));
  return (
    <span className="tabular-nums text-xs text-ink-soft" title="Tid siden start">
      {String(Math.floor(s / 60)).padStart(2, "0")}:{String(s % 60).padStart(2, "0")}
    </span>
  );
}
