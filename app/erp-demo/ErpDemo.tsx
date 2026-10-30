"use client";
import { Fragment, useCallback, useEffect, useState } from "react";
import type { ClaimDecision } from "@/lib/types";
import { formatOrgNr, nok } from "@/lib/validation";
import { Badge, Button, Card, ErrorBox, Spinner, cx } from "@/components/ui";
import { ClaimCheckList } from "@/components/wizard/SubmitStep";

// Demo-ERP bruker partner-API-et med sin API-nøkkel. I et ekte ERP ligger nøkkelen på serveren.
const API_KEY = "demo_erp_key";
const headers = { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" };

const COMPANIES = [
  { orgNr: "923456783", name: "Fjellheim Rørlegger AS" },
  { orgNr: "987654325", name: "Bølgen Kafé AS" },
  { orgNr: "812345672", name: "Nordlys Elektro Ola Hansen" },
];

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

const INVOICES = [
  { id: "INV-10231", debtor: { type: "company", orgNr: "975312461", name: "Vestkyst Eiendom AS", address: "Strandkaien 20, 4005 Stavanger" }, amount: 18750, due: 40, reminder: false, note: "Normal sak" },
  { id: "INV-10244", debtor: { type: "company", orgNr: "998877660", name: "Tindesport AS", address: "Fjellvegen 4, 2609 Lillehammer" }, amount: 6200, due: 32, reminder: true, note: "Inkassovarsel sendt – fra purrehistorikken" },
  { id: "INV-10198", debtor: { type: "company", orgNr: "934567897", name: "Gammel Handel AS", address: "Kirkegata 1, 0153 Oslo" }, amount: 32400, due: 120, reminder: false, note: "Skyldner under konkurs" },
  { id: "INV-10087", debtor: { type: "company", orgNr: "987654325", name: "Bølgen Kafé AS", address: "Bryggen 3, 5003 Bergen" }, amount: 312000, due: 60, reminder: false, note: "Stort beløp" },
  { id: "INV-8120", debtor: { type: "person", name: "Hans Hansen", address: "Lia 7, 7020 Trondheim" }, amount: 4500, due: 1180, reminder: false, note: "Over 3 år gammel" },
] as const;

type Result = { status: string; caseNumber: string | null; nextAction: string | null; phaseLabel?: string; claimCheck?: ClaimDecision; error?: string };
type ApiCase = Result & { externalId: string };

export function ErpDemo() {
  const [orgNr, setOrgNr] = useState(COMPANIES[0].orgNr);
  const [connection, setConnection] = useState<{ connected: boolean; customerNumber?: string; portalUrl?: string } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncedAt, setSyncedAt] = useState<Date | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [results, setResults] = useState<Record<string, Result | "loading">>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const invoices = INVOICES.filter((i) => !("orgNr" in i.debtor) || i.debtor.orgNr !== orgNr);

  // Statussynk: ERP henter status på sine saker fra Intrum (GET /cases)
  const syncStatus = useCallback(async (org: string) => {
    setSyncing(true);
    const r = await fetch(`/api/partner/v1/cases?creditorOrgNr=${org}`, { headers });
    if (r.ok) {
      const list: ApiCase[] = await r.json();
      setResults(Object.fromEntries(list.map((c) => [c.externalId, c])));
      setSyncedAt(new Date());
    }
    setSyncing(false);
  }, []);

  const checkConnection = useCallback(
    async (org: string) => {
      setConnection(null);
      const r = await fetch(`/api/partner/v1/connections?orgNr=${org}`, { headers });
      const conn = await r.json();
      setConnection(conn);
      if (conn.connected) syncStatus(org);
    },
    [syncStatus],
  );

  useEffect(() => {
    try {
      const saved = localStorage.getItem("erp-demo-org");
      if (saved) setOrgNr(saved);
    } catch {}
  }, []);

  useEffect(() => {
    checkConnection(orgNr);
    setResults({});
    setSelected([]);
  }, [orgNr, checkConnection]);

  async function activate() {
    setActivating(true);
    setError(null);
    try {
      const r = await fetch("/api/partner/v1/onboarding-links", {
        method: "POST",
        headers,
        body: JSON.stringify({ orgNr, returnUrl: `${window.location.origin}/erp-demo` }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      try {
        localStorage.setItem("erp-demo-org", orgNr);
        localStorage.removeItem("intrum-onboarding-id");
      } catch {}
      window.location.href = data.url;
    } catch (e) {
      setError((e as Error).message);
      setActivating(false);
    }
  }

  async function send() {
    setError(null);
    for (const id of selected) {
      const inv = invoices.find((i) => i.id === id)!;
      setResults((r) => ({ ...r, [id]: "loading" }));
      const res = await fetch("/api/partner/v1/cases", {
        method: "POST",
        headers,
        body: JSON.stringify({
          creditorOrgNr: orgNr,
          externalId: inv.id,
          debtor: inv.debtor,
          invoice: { number: inv.id, issueDate: daysAgo(inv.due + 14), dueDate: daysAgo(inv.due), amount: inv.amount },
          reminderAlreadySent: inv.reminder,
          // Purrehistorikk fra ERP: varsel sendt 2 dager etter forfall med 14 dagers frist
          notice: inv.reminder ? { sentDate: daysAgo(inv.due - 2), deadline: daysAgo(inv.due - 16) } : undefined,
        }),
      });
      const data = await res.json();
      setResults((r) => ({ ...r, [id]: res.status >= 400 && !data.claimCheck ? { status: "error", caseNumber: null, nextAction: null, error: data.error } : data }));
    }
    setSelected([]);
  }

  const statusBadge = (r: Result) => {
    if (r.status === "registered") return <Badge tone={r.phaseLabel?.startsWith("Beløpet") ? "green" : "brand"}>{r.phaseLabel ?? "Sendt"}</Badge>;
    if (r.status === "manual_review") return <Badge tone="amber">Til kontroll</Badge>;
    if (r.status === "rejected") return <Badge tone="red">Avvist</Badge>;
    return <Badge tone="red">Feil</Badge>;
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="rounded-2xl overflow-hidden ring-1 ring-black/10 bg-white shadow-sm">
        <div className="bg-slate-800 text-white px-5 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="font-bold">Demo-ERP</span>
            <span className="text-xs bg-white/15 rounded px-2 py-0.5">Simulert regnskapssystem</span>
          </div>
          <select value={orgNr} onChange={(e) => setOrgNr(e.target.value)} className="bg-slate-700 rounded-lg px-3 py-1.5 text-sm">
            {COMPANIES.map((c) => (
              <option key={c.orgNr} value={c.orgNr}>
                {c.name} ({formatOrgNr(c.orgNr)})
              </option>
            ))}
          </select>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          <div>
            <h1 className="text-xl font-semibold">Kundefakturaer – forfalt</h1>
            <p className="text-sm text-slate-500">Utvalg av forfalte fakturaer i regnskapet.</p>
          </div>

          {!connection ? (
            <div className="py-6 grid place-items-center text-slate-400">
              <Spinner className="size-6" />
            </div>
          ) : !connection.connected ? (
            <div className="rounded-xl bg-brand-50 ring-1 ring-brand-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="font-semibold text-ink">Send forfalte fakturaer til inkasso hos Intrum</div>
                <div className="text-sm text-ink-soft">Aktiver på 2–3 minutter med BankID. Bedriften er allerede fylt ut.</div>
              </div>
              <Button onClick={activate} loading={activating}>
                Aktiver Intrum inkasso
              </Button>
            </div>
          ) : (
            <div className="rounded-xl bg-emerald-50 ring-1 ring-emerald-200 px-4 py-3 text-sm flex flex-wrap items-center justify-between gap-3">
              <span>
                Koblet til Intrum · kundenr. <b>{connection.customerNumber}</b>
                {syncedAt && <span className="text-slate-500"> · status hentet {syncedAt.toLocaleTimeString("nb-NO")}</span>}
              </span>
              <span className="flex items-center gap-3">
                <button onClick={() => syncStatus(orgNr)} className="text-brand-700 hover:underline" disabled={syncing}>
                  {syncing ? "Henter …" : "Hent status fra Intrum"}
                </button>
                {connection.portalUrl && (
                  <a href={connection.portalUrl} className="text-brand-700 hover:underline">
                    Følg sakene i Intrum kundeportal →
                  </a>
                )}
              </span>
            </div>
          )}
          <ErrorBox message={error} />

          <div className="overflow-x-auto -mx-5 sm:mx-0">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="text-left text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2 pl-5 sm:pl-0 w-8"></th>
                  <th className="py-2">Faktura</th>
                  <th className="py-2">Kunde</th>
                  <th className="py-2 text-right">Beløp</th>
                  <th className="py-2 pl-6">Forfalt</th>
                  <th className="py-2 pr-5 sm:pr-0">Status hos Intrum</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const r = results[inv.id];
                  return (
                    <Fragment key={inv.id}>
                      <tr className="border-b border-slate-100 align-top">
                        <td className="py-3 pl-5 sm:pl-0">
                          <input
                            type="checkbox"
                            disabled={!connection?.connected || Boolean(r)}
                            checked={selected.includes(inv.id)}
                            onChange={(e) => setSelected(e.target.checked ? [...selected, inv.id] : selected.filter((x) => x !== inv.id))}
                            className="size-4 accent-brand-600"
                          />
                        </td>
                        <td className="py-3 font-mono text-xs">
                          {inv.id}
                          <div className="font-sans text-slate-400">{inv.note}</div>
                        </td>
                        <td className="py-3">{inv.debtor.name}</td>
                        <td className="py-3 text-right tabular-nums">{nok(inv.amount)}</td>
                        <td className="py-3 pl-6 text-slate-500">{inv.due} dager</td>
                        <td className="py-3 pr-5 sm:pr-0">
                          {r === "loading" ? (
                            <Spinner className="size-4 text-brand-600" />
                          ) : r ? (
                            <button onClick={() => setExpanded(expanded === inv.id ? null : inv.id)} className="text-left">
                              {statusBadge(r)}
                              <span className="block text-xs text-brand-700 mt-1">{expanded === inv.id ? "Skjul kontroll" : "Vis kontroll"}</span>
                            </button>
                          ) : (
                            <span className="text-slate-400">–</span>
                          )}
                        </td>
                      </tr>
                      {r && r !== "loading" && expanded === inv.id && (
                        <tr className="border-b border-slate-100">
                          <td colSpan={6} className="px-5 sm:px-0 py-4">
                            <Card className={cx("p-4")}>
                              {r.claimCheck ? <ClaimCheckList check={r.claimCheck} /> : <ErrorBox message={r.error} />}
                              {r.caseNumber && <div className="mt-3 text-sm text-ink-soft">Saksnr. {r.caseNumber}. Oppfølging, saksgang og meldinger skjer i Intrums kundeportal.</div>}
                            </Card>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <Button onClick={send} disabled={!connection?.connected || selected.length === 0}>
              Send {selected.length || ""} til inkasso hos Intrum
            </Button>
          </div>
        </div>
      </div>

      <p className="mt-4 text-sm text-ink-soft">
        Beslutningen om å sende til inkasso tas her i ERP-et. Demo-ERP kaller Intrums partner-API:{" "}
        <code className="text-xs">POST /onboarding-links</code> for aktivering, <code className="text-xs">POST /cases</code> per faktura og{" "}
        <code className="text-xs">GET /cases</code> for status tilbake. Samme kravkontroll som i skjemaet.{" "}
        <a href="/partner" className="text-brand-700 underline">
          Se API-dokumentasjon
        </a>
      </p>
    </div>
  );
}
