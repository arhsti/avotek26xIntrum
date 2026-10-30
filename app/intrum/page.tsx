import type { Metadata } from "next";
import { db, dbBackend } from "@/lib/db";
import { STEPS, STEP_LABELS, type DebtCase, type IntegrationLog, type Onboarding } from "@/lib/types";
import { formatOrgNr, nok } from "@/lib/validation";
import { AutoRefresh } from "./AutoRefresh";

export const metadata: Metadata = { title: "Innsikt – Intrum SMB-onboarding (prototype)" };
export const dynamic = "force-dynamic";

const fmtTime = (iso: string) => new Date(iso).toLocaleString("nb-NO", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });

function fmtDuration(ms: number) {
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${s % 60} s`;
}

function median(xs: number[]) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const STATUS_LABEL: Record<string, string> = {
  started: "Pågår",
  completed: "Fullført",
  blocked: "Stoppet",
  draft: "Utkast",
  registered: "Registrert",
  manual_review: "Manuell kontroll",
  rejected: "Avvist",
};

const pill = (status: string) => {
  const tone =
    status === "completed" || status === "registered"
      ? "bg-emerald-100 text-emerald-800"
      : status === "blocked" || status === "rejected"
        ? "bg-red-100 text-red-700"
        : status === "manual_review"
          ? "bg-amber-100 text-amber-800"
          : "bg-black/5 text-ink-soft";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${tone}`}>{STATUS_LABEL[status] ?? status}</span>;
};

export default async function Admin() {
  const [onboardings, cases, log] = await Promise.all([
    db.list<Onboarding>("onboardings", 1000),
    db.list<DebtCase>("cases", 1000),
    db.list<IntegrationLog>("integration_log", 60),
  ]);

  const started = onboardings.filter((o) => o.company); // teller kun de som kom forbi første felt
  const completed = onboardings.filter((o) => o.status === "completed");
  const conversion = started.length ? Math.round((completed.length / started.length) * 100) : 0;
  const med = median(completed.map((o) => new Date(o.completedAt!).getTime() - new Date(o.startedAt).getTime()));
  const submitted = cases.filter((c) => c.status !== "draft");
  const autoApproved = submitted.filter((c) => c.claimCheck?.decision === "approved").length;
  const nameByOrg = new Map(onboardings.map((o) => [o.orgNr, o.company?.name]));

  // Proaktiv oppfølging (fase 6 i dagens prosesskart): hvem bør noen ta kontakt med?
  const now = Date.now();
  const STALE_MIN = 15; // prototype: 15 min uten aktivitet regnes som frafall (i drift: f.eks. 1 døgn)
  const casesByOrg = (org?: string) => cases.filter((c) => c.creditorOrgNr === org && c.status !== "draft");
  const followUps: { who: string; signal: string; action: string; role: string; tone: "amber" | "brand" | "red" }[] = [];
  for (const o of onboardings) {
    const name = o.company?.name ?? "Ukjent bedrift";
    const contact = o.contact?.email ? ` · ${o.contact.email}` : "";
    const idleMin = (now - new Date(o.updatedAt).getTime()) / 60000;
    if (o.status === "blocked") {
      followUps.push({ who: name, signal: o.blockedReason ?? "Stoppet", action: "Ring kunden og forklar alternativer", role: "Kundesupport", tone: "red" });
    } else if (o.status === "started" && o.company && idleMin > STALE_MIN) {
      followUps.push({ who: name + contact, signal: `Falt fra i steget «${STEP_LABELS[o.step]}» for ${Math.round(idleMin)} min siden`, action: "Send påminnelse med lenke for å fortsette", role: "Automatisk / Kundesupport", tone: "amber" });
    }
    if (o.status === "completed" && o.profile?.segment === "advisor") {
      followUps.push({ who: name + contact, signal: `Passer ikke standard: ${o.profile.reasons.join(", ")}`, action: "Rådgiver kontakter kunden innen 1 virkedag", role: "Salg / Partnerskap", tone: "brand" });
    }
    const webCases = casesByOrg(o.orgNr).filter((c) => c.source !== "erp").length;
    if (o.status === "completed" && !o.erp && !o.channel && webCases >= 3) {
      followUps.push({ who: name, signal: `${webCases} saker sendt manuelt`, action: "Tilby ERP-integrasjon", role: "Kundesupport", tone: "brand" });
    }
    if ((o.erp || o.partnerConnection) && !o.integration && casesByOrg(o.orgNr).every((c) => c.source !== "erp")) {
      followUps.push({ who: name, signal: `Koblet til ${o.erp?.system ?? o.channel?.partnerName}, men ingen sak fra ERP ennå`, action: "Sjekk at kunden vet hvordan man sender fra ERP", role: "Kundesupport", tone: "amber" });
    }
  }
  for (const c of cases.filter((x) => x.status === "manual_review")) {
    followUps.push({
      who: `${nameByOrg.get(c.creditorOrgNr) ?? c.creditorOrgNr} → ${c.debtor.name}`,
      signal: c.claimCheck?.checks.filter((x) => x.status === "warn").map((x) => x.detail).join(" · ") || "Manuell kontroll",
      action: c.disputed ? "Vurder innsigelsen" : "Kontroller saken",
      role: "Saksbehandler",
      tone: "amber",
    });
  }

  const funnelSteps = STEPS.filter((s) => s !== "submit");
  const funnel = funnelSteps.map((s) => {
    const idx = STEPS.indexOf(s);
    const relevant = s === "case" ? onboardings.filter((o) => !o.channel) : onboardings;
    return { step: s, count: relevant.filter((o) => STEPS.indexOf(o.step) >= idx).length };
  });
  const max = Math.max(1, ...funnel.map((f) => f.count));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      <AutoRefresh />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Innsikt</h1>
          <p className="text-ink-soft mt-1">Konvertering fra første besøk til innsendt sak. Oppdateres automatisk.</p>
        </div>
        <span className="text-xs text-ink-soft">
          Database: <b>{dbBackend}</b>
          {dbBackend === "tmp-file" && " (midlertidig – sett DATABASE_URL for varig lagring)"}
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { k: "Påbegynt", v: String(started.length) },
          { k: "Fullført", v: String(completed.length) },
          { k: "Konvertering", v: `${conversion} %` },
          { k: "Median tid til første sak", v: med === null ? "–" : fmtDuration(med) },
          { k: "Saker sendt inn", v: String(submitted.length) },
          { k: "Godkjent automatisk", v: submitted.length ? `${Math.round((autoApproved / submitted.length) * 100)} %` : "–" },
          { k: "Via ERP-partner", v: String(submitted.filter((c) => c.source === "erp").length) },
          { k: "Integrasjonskall (siste)", v: String(log.length) },
        ].map((s) => (
          <div key={s.k} className="rounded-2xl bg-white ring-1 ring-black/5 p-5">
            <div className="text-sm text-ink-soft">{s.k}</div>
            <div className="mt-1 text-2xl font-bold tabular-nums">{s.v}</div>
          </div>
        ))}
      </div>

      <section className="rounded-2xl bg-white ring-1 ring-black/5 overflow-hidden">
        <div className="p-6 pb-3">
          <h2 className="font-semibold">Oppfølging</h2>
          <p className="text-sm text-ink-soft">Kunder og saker der et menneske bør ta kontakt – i stedet for at alle nye kunder følges opp manuelt.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead className="text-left text-ink-soft border-y border-black/5 bg-canvas">
              <tr>
                <th className="px-6 py-2 font-medium">Hvem</th>
                <th className="py-2 font-medium">Signal</th>
                <th className="py-2 font-medium">Neste steg</th>
                <th className="py-2 pr-6 font-medium">Rolle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {followUps.map((f, i) => (
                <tr key={i} className="align-top">
                  <td className="px-6 py-2.5">{f.who}</td>
                  <td className="py-2.5 text-ink-soft max-w-[320px]">{f.signal}</td>
                  <td className="py-2.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        f.tone === "red" ? "bg-red-100 text-red-700" : f.tone === "amber" ? "bg-amber-100 text-amber-800" : "bg-brand-100 text-brand-700"
                      }`}
                    >
                      {f.action}
                    </span>
                  </td>
                  <td className="py-2.5 pr-6 text-ink-soft whitespace-nowrap">{f.role}</td>
                </tr>
              ))}
              {followUps.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-6 text-ink-soft">
                    Ingen trenger oppfølging nå.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl bg-white ring-1 ring-black/5 p-6">
        <h2 className="font-semibold">Trakt</h2>
        <div className="mt-4 space-y-2.5">
          {funnel.map((f) => (
            <div key={f.step} className="grid grid-cols-[140px_1fr_40px] items-center gap-3 text-sm">
              <span className="text-ink-soft truncate">{STEP_LABELS[f.step]}</span>
              <div className="h-6 rounded-md bg-brand-50 overflow-hidden">
                <div className="h-full rounded-md bg-brand-500" style={{ width: `${(f.count / max) * 100}%` }} />
              </div>
              <span className="tabular-nums text-right">{f.count}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-white ring-1 ring-black/5 overflow-hidden">
        <h2 className="font-semibold p-6 pb-3">Siste saker</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead className="text-left text-ink-soft border-y border-black/5 bg-canvas">
              <tr>
                <th className="px-6 py-2 font-medium">Saksnr.</th>
                <th className="py-2 font-medium">Kreditor</th>
                <th className="py-2 font-medium">Skyldner</th>
                <th className="py-2 font-medium text-right">Beløp</th>
                <th className="py-2 pl-4 font-medium">Kanal</th>
                <th className="py-2 font-medium">Status</th>
                <th className="py-2 pr-6 font-medium">Avvik</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {submitted.slice(0, 20).map((c) => (
                <tr key={c.id} className="align-top">
                  <td className="px-6 py-2.5 font-mono text-xs">{c.caseNumber ?? "–"}</td>
                  <td className="py-2.5">{nameByOrg.get(c.creditorOrgNr) ?? formatOrgNr(c.creditorOrgNr ?? "")}</td>
                  <td className="py-2.5">{c.debtor.name}</td>
                  <td className="py-2.5 text-right tabular-nums">{nok(c.invoice.amount)}</td>
                  <td className="py-2.5 pl-4">{c.channel === "web" || !c.channel ? "Skjema" : c.channel}</td>
                  <td className="py-2.5">{pill(c.status)}</td>
                  <td className="py-2.5 pr-6 text-xs text-ink-soft max-w-[240px]">
                    {c.claimCheck?.checks
                      .filter((x) => x.status === "warn" || x.status === "fail")
                      .map((x) => x.detail)
                      .join(" · ") || "–"}
                  </td>
                </tr>
              ))}
              {submitted.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-6 text-ink-soft">
                    Ingen saker ennå.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl bg-white ring-1 ring-black/5 overflow-hidden">
        <h2 className="font-semibold p-6 pb-3">Onboardinger</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="text-left text-ink-soft border-y border-black/5 bg-canvas">
              <tr>
                <th className="px-6 py-2 font-medium">Startet</th>
                <th className="py-2 font-medium">Bedrift</th>
                <th className="py-2 font-medium">Kanal</th>
                <th className="py-2 font-medium">Steg</th>
                <th className="py-2 font-medium">Status</th>
                <th className="py-2 pr-6 font-medium text-right">Tid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {onboardings.slice(0, 25).map((o) => (
                <tr key={o.id}>
                  <td className="px-6 py-2.5 tabular-nums text-ink-soft">{fmtTime(o.startedAt)}</td>
                  <td className="py-2.5">{o.company?.name ?? <span className="text-ink-soft">–</span>}</td>
                  <td className="py-2.5">
                    {o.channel?.partnerName ?? "intrum.no"}
                    {o.profile?.segment === "advisor" && <span className="block text-xs text-brand-700">Rådgiver</span>}
                    {o.integration && <span className="block text-xs text-emerald-700">Integrasjon verifisert</span>}
                  </td>
                  <td className="py-2.5">{STEP_LABELS[o.step]}</td>
                  <td className="py-2.5">
                    {pill(o.status)}
                    {o.blockedReason && <span className="block text-xs text-ink-soft mt-1">{o.blockedReason}</span>}
                  </td>
                  <td className="py-2.5 pr-6 text-right tabular-nums">
                    {o.completedAt ? fmtDuration(new Date(o.completedAt).getTime() - new Date(o.startedAt).getTime()) : "–"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl bg-white ring-1 ring-black/5 overflow-hidden">
        <h2 className="font-semibold p-6 pb-3">Integrasjonslogg</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="text-left text-ink-soft border-y border-black/5 bg-canvas">
              <tr>
                <th className="px-6 py-2 font-medium">Tid</th>
                <th className="py-2 font-medium">System</th>
                <th className="py-2 font-medium">Kall</th>
                <th className="py-2 font-medium">Status</th>
                <th className="py-2 pr-6 font-medium text-right">Varighet</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {log.map((l) => (
                <tr key={l.id}>
                  <td className="px-6 py-2 tabular-nums text-ink-soft whitespace-nowrap">{fmtTime(l.createdAt)}</td>
                  <td className="py-2 whitespace-nowrap">{l.system}</td>
                  <td className="py-2 font-mono text-xs">{l.action}</td>
                  <td className="py-2">{l.status === "ok" ? <span className="text-emerald-700 text-xs">OK</span> : <span className="text-red-600 text-xs">Feil</span>}</td>
                  <td className="py-2 pr-6 text-right tabular-nums text-ink-soft">{l.durationMs} ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
