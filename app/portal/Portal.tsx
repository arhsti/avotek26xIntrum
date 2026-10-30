"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { AuthorizedUser, DebtCaseRow } from "@/lib/types";
import { formatOrgNr, nok } from "@/lib/validation";
import { caseTimeline } from "@/lib/timeline";
import { CaseTimeline } from "@/components/CaseTimeline";
import { Badge, Button, Card, ErrorBox, Spinner, api, cx } from "@/components/ui";

type PortalCase = DebtCaseRow & { phase: { code: string; label: string } };
type PortalData = {
  customer: {
    name: string;
    orgNr: string;
    customerNumber: string;
    user?: string;
    channel: string | null;
    integration: { partner: string; verifiedAt: string } | null;
  };
  access: {
    signature?: { rule: string };
    prokura: { rule: string } | null;
    users: AuthorizedUser[];
    checkedAt: string | null;
  };
  cases: PortalCase[];
};

const fmt = (iso: string) => new Date(iso).toLocaleString("nb-NO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

const phaseTone = (code: string) =>
  code === "settled" || code === "paid" ? "green" : code === "rejected" ? "red" : code === "manual_review" ? "amber" : "brand";

const channelLabel = (c: PortalCase) => (c.source === "erp" ? `Fra ${c.channel === "demo-erp" ? "Demo-ERP" : c.channel}` : "Fra skjema");

export function Portal() {
  const [id, setId] = useState<string | null>(null);
  const [data, setData] = useState<PortalData | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");

  const load = useCallback(async (oid: string) => {
    try {
      const d = await api<PortalData>(`/api/portal/${oid}`, undefined, "GET");
      setData(d);
      setSelected((s) => s ?? d.cases[0]?.id ?? null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    let oid = new URLSearchParams(window.location.search).get("id");
    try {
      oid ??= localStorage.getItem("intrum-portal-id") ?? localStorage.getItem("intrum-onboarding-id");
    } catch {}
    setId(oid);
    if (oid) load(oid);
    else setError("Fant ingen kunde. Fullfør onboarding først.");
  }, [load]);

  const c = data?.cases.find((x) => x.id === selected) ?? null;

  async function act(action: "advance" | "messages", body?: unknown) {
    if (!id || !c) return;
    setBusy(true);
    try {
      await api(`/api/portal/${id}/cases/${c.id}/${action}`, body ?? {});
      if (action === "messages") setText("");
      await load(id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (error && !data) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 space-y-4">
        <ErrorBox message={error} />
        <Link href="/onboarding" className="text-brand-700 underline">
          Gå til onboarding
        </Link>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="grid place-items-center py-32 text-brand-600">
        <Spinner className="size-8" />
      </div>
    );
  }

  const open = data.cases.filter((x) => !["settled", "rejected"].includes(x.phase.code));
  const outstanding = open.reduce((sum, x) => sum + x.invoice.amount, 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-sm text-brand-600 font-medium">Kundeportal</div>
          <h1 className="text-3xl font-bold tracking-tight">{data.customer.name}</h1>
          <div className="text-sm text-ink-soft mt-1">
            Org.nr {formatOrgNr(data.customer.orgNr)} · Kundenr. {data.customer.customerNumber} · Innlogget med BankID som {data.customer.user} (simulert)
          </div>
        </div>
        {data.customer.channel && (
          <div className="flex flex-col items-end gap-1">
            <Badge>Saker sendes fra {data.customer.channel}</Badge>
            {data.customer.integration ? (
              <Badge tone="green">Integrasjon verifisert {new Date(data.customer.integration.verifiedAt).toLocaleDateString("nb-NO")}</Badge>
            ) : (
              <Badge tone="gray">Venter på første sak fra ERP</Badge>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { k: "Aktive saker", v: String(open.length) },
          { k: "Utestående", v: nok(outstanding) },
          { k: "Avsluttede", v: String(data.cases.filter((x) => x.phase.code === "settled").length) },
        ].map((s) => (
          <Card key={s.k} className="p-5">
            <div className="text-sm text-ink-soft">{s.k}</div>
            <div className="text-2xl font-bold mt-1 tabular-nums">{s.v}</div>
          </Card>
        ))}
      </div>

      {id && <AccessPanel id={id} access={data.access} onChange={() => load(id)} />}

      <div className="grid lg:grid-cols-[360px_1fr] gap-6">
        <Card className="overflow-hidden self-start">
          <div className="px-5 py-4 font-semibold border-b border-black/5">Saker</div>
          {data.cases.length === 0 && <div className="p-5 text-sm text-ink-soft">Ingen saker ennå.</div>}
          <ul className="divide-y divide-black/5">
            {data.cases.map((x) => (
              <li key={x.id}>
                <button onClick={() => setSelected(x.id)} className={cx("w-full text-left px-5 py-3 hover:bg-brand-50", x.id === selected && "bg-brand-50")}>
                  <div className="flex justify-between gap-2">
                    <span className="font-medium truncate">{x.debtor.name}</span>
                    <span className="tabular-nums text-sm">{nok(x.invoice.amount)}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs">
                    <Badge tone={phaseTone(x.phase.code)}>{x.phase.label.split(" – ")[0]}</Badge>
                    <span className="text-ink-soft">{channelLabel(x)}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </Card>

        {c && (
          <div className="space-y-6 min-w-0">
            <Card className="p-5">
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <div className="text-sm text-ink-soft">Sak {c.caseNumber ?? "–"} · faktura {c.invoice.number}</div>
                  <div className="text-xl font-semibold">{c.debtor.name}</div>
                  <div className="text-sm text-ink-soft">
                    {nok(c.invoice.amount)} · forfalt {new Date(c.invoice.dueDate).toLocaleDateString("nb-NO")} · {channelLabel(c)}
                  </div>
                </div>
              </div>
              <div className="mt-3">
                <Badge tone={phaseTone(c.phase.code)}>{c.phase.label}</Badge>
              </div>

              <h2 className="font-semibold mt-6 mb-4">Tidslinje</h2>
              {c.status === "rejected" ? (
                <p className="text-sm text-ink-soft">Saken ble avvist i kravkontrollen og er ikke sendt videre.</p>
              ) : (
                <CaseTimeline steps={caseTimeline(c)} />
              )}
              {c.phase.code !== "settled" && c.status !== "rejected" && (
                <Button variant="secondary" className="mt-5" onClick={() => act("advance")} loading={busy}>
                  Simuler neste hendelse (demo)
                </Button>
              )}
            </Card>

            <Card className="p-5">
              <h2 className="font-semibold mb-3">Meldinger</h2>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {(c.messages ?? []).length === 0 && <div className="text-sm text-ink-soft">Har du spørsmål om saken, eller har skyldner betalt til deg? Send oss en melding.</div>}
                {(c.messages ?? []).map((m) => (
                  <div key={m.at + m.from} className={cx("flex", m.from === "kunde" ? "justify-end" : "justify-start")}>
                    <div className={cx("max-w-[80%] rounded-2xl px-4 py-2 text-sm", m.from === "kunde" ? "bg-brand-600 text-white" : "bg-canvas")}>
                      <div>{m.text}</div>
                      <div className={cx("text-[11px] mt-1", m.from === "kunde" ? "text-brand-100" : "text-ink-soft")}>
                        {m.from === "kunde" ? "Du" : "Intrum saksbehandler"} · {fmt(m.at)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  act("messages", { text });
                }}
                className="mt-4 flex gap-2"
              >
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Skriv en melding …"
                  className="flex-1 min-w-0 rounded-xl border border-black/15 px-4 py-2.5 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                />
                <Button type="submit" loading={busy} disabled={!text.trim()}>
                  Send
                </Button>
              </form>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

function AccessPanel({ id, access, onChange }: { id: string; access: PortalData["access"]; onChange: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function grant(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api(`/api/portal/${id}/users`, { name, email });
      setName("");
      setEmail("");
      setOpen(false);
      onChange();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Brukere og tilganger</h2>
        </div>
        <div className="text-xs text-ink-soft">Holdes oppdatert mot Brønnøysund</div>
      </div>
      {!expanded ? (
        <button onClick={() => setExpanded(true)} className="mt-2 text-sm font-semibold text-brand-700 hover:underline min-h-11">
          {access.users.length} personer kan sende saker · vis og endre
        </button>
      ) : (
      <>
      <ul className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {access.users.map((u) => (
          <li key={u.name + u.at} className="rounded-xl bg-canvas px-4 py-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{u.name}</span>
              <Badge tone={u.source === "brreg" ? "brand" : "gray"}>{u.source === "brreg" ? "Brønnøysund" : "Fullmakt"}</Badge>
            </div>
            <div className="text-xs text-ink-soft mt-1">
              {u.basis}
              {u.grantedBy && ` · gitt av ${u.grantedBy}`}
            </div>
          </li>
        ))}
      </ul>
      {!open ? (
        <button onClick={() => setOpen(true)} className="mt-3 text-sm font-semibold text-brand-700 hover:underline min-h-11">
          + Gi fullmakt til regnskapsfører eller ansatt
        </button>
      ) : (
        <form onSubmit={grant} className="mt-4 grid sm:grid-cols-[1fr_1fr_auto] gap-2 items-start">
          <input
            aria-label="Navn"
            placeholder="Navn"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-xl border border-black/15 px-4 py-2.5 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
          />
          <input
            aria-label="E-post"
            type="email"
            placeholder="E-post"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-xl border border-black/15 px-4 py-2.5 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
          />
          <Button type="submit" loading={busy}>
            Signer fullmakt med BankID
          </Button>
          <div className="sm:col-span-3">
            <ErrorBox message={error} />
          </div>
        </form>
      )}
      </>
      )}
    </Card>
  );
}
