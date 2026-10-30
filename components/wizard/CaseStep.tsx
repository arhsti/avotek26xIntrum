"use client";
import { useRef, useState } from "react";
import type { DebtCase, DebtCaseRow, InvoicePrefill, Payment } from "@/lib/types";
import { cleanDigits, formatOrgNr, isValidOrgNr, nok } from "@/lib/validation";
import { Badge, Button, Card, ErrorBox, Input, Spinner, api, cx } from "../ui";
import { StepHeader, type StepProps } from "./steps";

type PaymentRow = { date: string; amount: string; type: Payment["type"] };

type Form = {
  reference: string;
  claimType: NonNullable<DebtCase["claimType"]>;
  debtorType: "company" | "person";
  debtorOrgNr: string;
  debtorName: string;
  debtorAddress: string;
  debtorEmail: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  amount: string;
  description: string;
  payments: PaymentRow[];
  reminderAlreadySent: boolean;
  noticeSent: string;
  noticeDeadline: string;
  noticeFile: string;
  attachments: string[];
  disputed: boolean;
  disputeNote: string;
  confirmed: boolean;
};

const DAY = 86400000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY).toISOString().slice(0, 10);
const toAmount = (s: string) => Number(s.replace(/\s/g, "").replace(",", ".")) || 0;
const fmtAmount = (n: number) => String(n).replace(".", ",");

function initialForm(c: DebtCaseRow | null, p?: InvoicePrefill): Form {
  const debtor = c?.debtor ?? p?.debtor;
  const invoice = c?.invoice ?? p?.invoice;
  return {
    reference: c?.reference ?? "",
    claimType: c?.claimType ?? "faktura",
    debtorType: debtor?.type ?? "company",
    debtorOrgNr: debtor?.orgNr ? formatOrgNr(debtor.orgNr) : "",
    debtorName: debtor?.name ?? "",
    debtorAddress: debtor?.address ?? "",
    debtorEmail: debtor?.email ?? "",
    invoiceNumber: invoice?.number ?? "",
    issueDate: invoice?.issueDate ?? "",
    dueDate: invoice?.dueDate ?? "",
    amount: invoice ? fmtAmount(invoice.amount) : "",
    description: invoice?.description ?? "",
    payments: (c?.payments ?? []).map((x) => ({ date: x.date, amount: fmtAmount(x.amount), type: x.type })),
    reminderAlreadySent: c?.reminderAlreadySent ?? false,
    noticeSent: c?.notice?.sentDate ?? "",
    noticeDeadline: c?.notice?.deadline ?? "",
    noticeFile: c?.notice?.fileName ?? "",
    attachments: c?.attachments ?? (p ? [p.fileName] : []),
    disputed: c?.disputed ?? false,
    disputeNote: c?.disputeNote ?? "",
    confirmed: false,
  };
}

type OcrResult = { confidence: number; debtor: DebtCase["debtor"]; invoice: DebtCase["invoice"] };

export function CaseStep({ o, draftCase, setDraftCase, go }: StepProps) {
  const prefill = o.prefill;
  const [form, setForm] = useState<Form>(initialForm(draftCase, prefill));
  const [mode, setMode] = useState<"upload" | "manual">(draftCase || prefill ? "manual" : "upload");
  const [source, setSource] = useState<"manual" | "ocr">(draftCase?.source === "ocr" || prefill ? "ocr" : "manual");
  const [ocrState, setOcrState] = useState<{ loading: boolean; fileName?: string; confidence?: number }>(
    prefill && !draftCase ? { loading: false, fileName: prefill.fileName, confidence: prefill.confidence } : { loading: false },
  );
  const [debtorLookup, setDebtorLookup] = useState<"idle" | "loading" | "found">(form.debtorOrgNr ? "found" : "idle");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const noticeRef = useRef<HTMLInputElement>(null);
  const attachRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  // Utledet: utestående, alder på kravet og hva som skjer først
  const paid = form.payments.reduce((s, p) => s + toAmount(p.amount), 0);
  const outstanding = toAmount(form.amount) - paid;
  const age = form.dueDate ? Math.floor((Date.now() - new Date(form.dueDate).getTime()) / DAY) : null;
  const noticeDays =
    form.noticeSent && form.noticeDeadline ? Math.round((new Date(form.noticeDeadline).getTime() - new Date(form.noticeSent).getTime()) / DAY) : null;
  const noticeOk =
    form.reminderAlreadySent && noticeDays !== null && noticeDays >= 14 && new Date(form.noticeDeadline).getTime() < Date.now();

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setOcrState({ loading: true, fileName: file.name });
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await api<OcrResult>(`/api/onboarding/${o.id}/ocr`, fd);
      setForm((f) => ({
        ...f,
        debtorType: r.debtor.type,
        debtorOrgNr: r.debtor.orgNr ? formatOrgNr(r.debtor.orgNr) : "",
        debtorName: r.debtor.name,
        debtorAddress: r.debtor.address ?? "",
        invoiceNumber: r.invoice.number,
        issueDate: r.invoice.issueDate,
        dueDate: r.invoice.dueDate,
        amount: fmtAmount(r.invoice.amount),
        description: r.invoice.description ?? "",
        attachments: [file.name, ...f.attachments.filter((a) => a !== file.name)],
      }));
      setSource("ocr");
      setDebtorLookup(r.debtor.orgNr ? "found" : "idle");
      setOcrState({ loading: false, fileName: file.name, confidence: r.confidence });
      setMode("manual");
    } catch (e) {
      setOcrState({ loading: false });
      setError((e as Error).message);
    }
  }

  async function lookupDebtor(value: string) {
    const digits = cleanDigits(value);
    if (!isValidOrgNr(digits)) return;
    setDebtorLookup("loading");
    try {
      const r = await api<{ name: string; address: string }>(`/api/onboarding/${o.id}/debtor`, { orgNr: digits });
      setForm((f) => ({ ...f, debtorName: r.name, debtorAddress: r.address }));
      setDebtorLookup("found");
    } catch {
      setDebtorLookup("idle");
    }
  }

  function fillExample() {
    setForm((f) => ({
      ...f,
      reference: "Prosjekt 114 – Strandkaien",
      debtorType: "company",
      debtorOrgNr: "975 312 461",
      debtorName: "Vestkyst Eiendom AS",
      debtorAddress: "Strandkaien 20, 4005 Stavanger",
      // Nytt nummer hver gang, ellers stopper duplikatkontrollen gjentatte demoer
      invoiceNumber: String(20000 + Math.floor(Math.random() * 79999)),
      issueDate: daysAgo(58),
      dueDate: daysAgo(44),
      amount: "18 750,00",
      description: "Utskifting av varmtvannsbereder",
      payments: [{ date: daysAgo(20), amount: "5000", type: "innbetaling" }],
      reminderAlreadySent: true,
      noticeSent: daysAgo(30),
      noticeDeadline: daysAgo(15),
      noticeFile: "inkassovarsel-20431.pdf",
      attachments: ["faktura-20431.pdf"],
    }));
    setDebtorLookup("found");
    setSource("manual");
    setMode("manual");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const saved = await api<DebtCaseRow>(`/api/onboarding/${o.id}/case`, {
        source,
        reference: form.reference,
        claimType: form.claimType,
        reminderAlreadySent: form.reminderAlreadySent,
        notice: form.reminderAlreadySent
          ? { sentDate: form.noticeSent, deadline: form.noticeDeadline, fileName: form.noticeFile || undefined }
          : undefined,
        payments: form.payments.map((p) => ({ date: p.date, amount: toAmount(p.amount), type: p.type })),
        attachments: form.attachments,
        disputed: form.disputed,
        disputeNote: form.disputeNote,
        confirmed: form.confirmed,
        debtor: {
          type: form.debtorType,
          orgNr: form.debtorType === "company" ? cleanDigits(form.debtorOrgNr) || undefined : undefined,
          name: form.debtorName,
          address: form.debtorAddress,
          email: form.debtorEmail || undefined,
        },
        invoice: {
          number: form.invoiceNumber,
          issueDate: form.issueDate,
          dueDate: form.dueDate,
          amount: toAmount(form.amount),
          description: form.description,
        },
      });
      setDraftCase(saved);
      go("submit");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <StepHeader
        title={prefill ? "Se over kravet" : "Send din første sak"}
        lead={
          prefill
            ? "Vi har fylt ut kravet fra fakturaen du lastet opp. Sjekk at det stemmer, og svar på de tre spørsmålene nederst."
            : "Last opp den ubetalte fakturaen, så fyller vi ut resten. Du kan også fylle inn selv."
        }
      />

      {!prefill && (
        <div className="inline-flex rounded-xl bg-black/5 p-1 mb-5 text-sm">
          {(["upload", "manual"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cx("px-4 py-2 rounded-lg font-medium", mode === m ? "bg-white shadow-sm" : "text-ink-soft")}
            >
              {m === "upload" ? "Last opp faktura" : "Fyll inn selv"}
            </button>
          ))}
        </div>
      )}

      {mode === "upload" && (
        <div>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              onFile(e.dataTransfer.files[0]);
            }}
            onClick={() => fileRef.current?.click()}
            className="cursor-pointer rounded-2xl border-2 border-dashed border-brand-200 bg-white p-10 text-center hover:border-brand-400 hover:bg-brand-50 transition"
          >
            {ocrState.loading ? (
              <div className="flex flex-col items-center gap-3 text-ink-soft">
                <Spinner className="size-8 text-brand-600" />
                <div>Leser {ocrState.fileName} …</div>
              </div>
            ) : (
              <>
                <div className="text-lg font-semibold">Dra fakturaen hit, eller klikk for å velge fil</div>
                <div className="text-sm text-ink-soft mt-1">PDF, JPG eller PNG. Alle filer gir fiktive data i prototypen.</div>
              </>
            )}
            <input ref={fileRef} type="file" accept=".pdf,image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          </div>
          <ErrorBox message={error} />
          <button type="button" onClick={fillExample} className="mt-3 text-sm text-brand-700 hover:underline">
            Eller bruk eksempeldata
          </button>
        </div>
      )}

      {mode === "manual" && (
        <form onSubmit={submit} className="space-y-6">
          {source === "ocr" && ocrState.fileName && (
            <div className="rounded-xl bg-emerald-50 ring-1 ring-emerald-200 p-4 text-sm flex items-center justify-between gap-3">
              <span>
                Vi har lest <b>{ocrState.fileName}</b>. Sjekk at alt stemmer.
              </span>
              <Badge tone="green">{Math.round((ocrState.confidence ?? 0) * 100)} % sikker</Badge>
            </div>
          )}

          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="font-semibold">1 · Hvem skylder penger?</h2>
              <div className="inline-flex rounded-lg bg-black/5 p-0.5 text-xs">
                {(["company", "person"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => set("debtorType", t)}
                    className={cx("px-3 py-1.5 rounded-md font-medium", form.debtorType === t ? "bg-white shadow-sm" : "text-ink-soft")}
                  >
                    {t === "company" ? "Bedrift" : "Privatperson"}
                  </button>
                ))}
              </div>
            </div>
            {form.debtorType === "company" ? (
              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  label="Organisasjonsnummer"
                  inputMode="numeric"
                  value={form.debtorOrgNr}
                  onChange={(e) => {
                    set("debtorOrgNr", e.target.value);
                    if (cleanDigits(e.target.value).length === 9) lookupDebtor(e.target.value);
                    else setDebtorLookup("idle");
                  }}
                  hint={debtorLookup === "loading" ? "Henter fra Brønnøysundregistrene …" : debtorLookup === "found" ? "Hentet fra Brønnøysundregistrene" : "Vi henter navn og adresse automatisk"}
                />
                <Input label="Navn" value={form.debtorName} onChange={(e) => set("debtorName", e.target.value)} />
                <Input label="Adresse" value={form.debtorAddress} onChange={(e) => set("debtorAddress", e.target.value)} />
                <Input label="E-post / mobil (valgfritt)" value={form.debtorEmail} onChange={(e) => set("debtorEmail", e.target.value)} hint="Gir raskere, digital oppfølging" />
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                <Input label="Fullt navn" value={form.debtorName} onChange={(e) => set("debtorName", e.target.value)} />
                <Input label="E-post / mobil (valgfritt)" value={form.debtorEmail} onChange={(e) => set("debtorEmail", e.target.value)} />
                <Input label="Adresse" value={form.debtorAddress} onChange={(e) => set("debtorAddress", e.target.value)} className="sm:col-span-2" />
              </div>
            )}
          </Card>

          <Card className="p-5 space-y-4">
            <h2 className="font-semibold">2 · Kravet</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="block text-sm font-medium mb-1.5">Type krav</span>
                <select
                  value={form.claimType}
                  onChange={(e) => set("claimType", e.target.value as Form["claimType"])}
                  className="w-full rounded-xl border border-black/15 bg-white px-4 py-3 text-base outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                >
                  <option value="faktura">Faktura</option>
                  <option value="husleie">Husleie</option>
                  <option value="felleskostnader">Felleskostnader</option>
                </select>
              </label>
              <Input label="Din referanse (valgfritt)" value={form.reference} onChange={(e) => set("reference", e.target.value)} hint="Vises på saken i portalen og i ERP" />
              <Input label="Fakturanummer" value={form.invoiceNumber} onChange={(e) => set("invoiceNumber", e.target.value)} />
              <Input label="Fakturabeløp inkl. mva (kr)" inputMode="decimal" value={form.amount} onChange={(e) => set("amount", e.target.value)} hint="Uten gebyrer og renter" />
              <Input label="Fakturadato" type="date" value={form.issueDate} onChange={(e) => set("issueDate", e.target.value)} />
              <Input label="Forfallsdato" type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} max={daysAgo(1)} />
              <Input label="Hva gjelder kravet? (valgfritt)" value={form.description} onChange={(e) => set("description", e.target.value)} className="sm:col-span-2" />
            </div>

            <div className="rounded-xl bg-canvas p-4 space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <span className="text-sm font-semibold">Innbetalinger og kreditnotaer</span>
                <button
                  type="button"
                  onClick={() => set("payments", [...form.payments, { date: daysAgo(1), amount: "", type: "innbetaling" }])}
                  className="text-sm font-semibold text-brand-700 hover:underline min-h-11"
                >
                  + Legg til
                </button>
              </div>
              {form.payments.length === 0 && <div className="text-sm text-ink-soft">Ingen – skyldner har ikke betalt noe.</div>}
              {form.payments.map((p, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr] sm:grid-cols-[150px_1fr_1fr_auto] gap-2 items-center">
                  <select
                    aria-label="Type"
                    value={p.type}
                    onChange={(e) => set("payments", form.payments.map((x, j) => (j === i ? { ...x, type: e.target.value as PaymentRow["type"] } : x)))}
                    className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
                  >
                    <option value="innbetaling">Innbetaling</option>
                    <option value="kreditnota">Kreditnota</option>
                  </select>
                  <input
                    aria-label="Dato"
                    type="date"
                    value={p.date}
                    onChange={(e) => set("payments", form.payments.map((x, j) => (j === i ? { ...x, date: e.target.value } : x)))}
                    className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
                  />
                  <input
                    aria-label="Beløp"
                    inputMode="decimal"
                    placeholder="Beløp"
                    value={p.amount}
                    onChange={(e) => set("payments", form.payments.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))}
                    className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => set("payments", form.payments.filter((_, j) => j !== i))}
                    className="text-sm text-ink-soft hover:text-ink px-2 min-h-11"
                  >
                    Fjern
                  </button>
                </div>
              ))}
              <div className="flex justify-between border-t border-black/10 pt-3 font-semibold">
                <span>Utestående hovedstol</span>
                <span className={cx("tabular-nums", outstanding <= 0 && "text-red-600")}>{nok(outstanding)}</span>
              </div>
              <div className="text-xs text-ink-soft">Forsinkelsesrente fra forfall beregnes av Intrum.</div>
            </div>
          </Card>

          <Card className="p-5 space-y-4">
            <h2 className="font-semibold">3 · Inkassovarsel</h2>
            <div className="space-y-2">
              {[
                { v: false, t: "Ikke sendt – Intrum sender inkassovarsel i dag", d: "Skyldner får 14 dagers frist. Purreservice, 0 kr." },
                { v: true, t: "Sendt av meg", d: "Oppgi dato og frist – da kan vi gå rett på betalingsoppfordring og spare 14 dager." },
              ].map((opt) => (
                <label
                  key={String(opt.v)}
                  className={cx("flex gap-3 rounded-xl p-3 ring-1 cursor-pointer", form.reminderAlreadySent === opt.v ? "ring-brand-500 bg-brand-50" : "ring-black/10")}
                >
                  <input type="radio" name="reminder" checked={form.reminderAlreadySent === opt.v} onChange={() => set("reminderAlreadySent", opt.v)} className="mt-1 accent-brand-600" />
                  <span>
                    <span className="block font-medium text-sm">{opt.t}</span>
                    <span className="block text-xs text-ink-soft">{opt.d}</span>
                  </span>
                </label>
              ))}
            </div>
            {form.reminderAlreadySent && (
              <div className="grid sm:grid-cols-3 gap-4 animate-fade-up">
                <Input label="Varsel sendt" type="date" value={form.noticeSent} onChange={(e) => set("noticeSent", e.target.value)} />
                <Input
                  label="Betalingsfrist i varselet"
                  type="date"
                  value={form.noticeDeadline}
                  onChange={(e) => set("noticeDeadline", e.target.value)}
                  error={noticeDays !== null && noticeDays < 14 ? `Bare ${noticeDays} dager – må være minst 14` : undefined}
                  hint={noticeDays !== null && noticeDays >= 14 ? `${noticeDays} dager – OK` : undefined}
                />
                <div>
                  <span className="block text-sm font-medium mb-1.5">Kopi av varselet</span>
                  <button
                    type="button"
                    onClick={() => noticeRef.current?.click()}
                    className="w-full rounded-xl border border-dashed border-brand-400 bg-brand-50 px-4 py-3 text-sm text-left truncate min-h-[50px]"
                  >
                    {form.noticeFile || "Last opp (valgfritt)"}
                  </button>
                  <input ref={noticeRef} type="file" className="hidden" onChange={(e) => e.target.files?.[0] && set("noticeFile", e.target.files[0].name)} />
                </div>
              </div>
            )}
          </Card>

          <Card className="p-5 space-y-3">
            <h2 className="font-semibold">4 · Dokumentasjon</h2>
            <div className="flex flex-wrap gap-2">
              {form.attachments.map((a) => (
                <span key={a} className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 px-3 py-1.5 text-sm">
                  {a}
                  <button type="button" aria-label={`Fjern ${a}`} onClick={() => set("attachments", form.attachments.filter((x) => x !== a))} className="text-emerald-700">
                    ×
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={() => attachRef.current?.click()}
                className="rounded-lg border border-dashed border-black/20 px-3 py-1.5 text-sm text-ink-soft hover:text-ink min-h-11"
              >
                + Faktura, avtale eller ordrebekreftelse
              </button>
              <input
                ref={attachRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => set("attachments", [...form.attachments, ...Array.from(e.target.files ?? []).map((f) => f.name)])}
              />
            </div>
            <div className="text-xs text-ink-soft">Brukes hvis skyldner protesterer. Legges ved med en gang – du trenger ikke vente til saken er registrert.</div>
          </Card>

          <Card className="p-5 space-y-3">
            <h2 className="font-semibold">5 · Bekreftelse</h2>
            <div className="text-sm font-medium">Har skyldner protestert på kravet (omtvistet)?</div>
            <div className="flex gap-2">
              {[false, true].map((v) => (
                <label
                  key={String(v)}
                  className={cx(
                    "flex gap-2 items-center rounded-xl px-4 py-2.5 ring-1 cursor-pointer text-sm",
                    form.disputed === v ? (v ? "ring-amber-500 bg-amber-50" : "ring-brand-500 bg-brand-50") : "ring-black/10",
                  )}
                >
                  <input type="radio" name="disputed" checked={form.disputed === v} onChange={() => set("disputed", v)} className="accent-brand-600" />
                  {v ? "Ja" : "Nei"}
                </label>
              ))}
            </div>
            {form.disputed && (
              <div className="space-y-2 animate-fade-up">
                <label className="block">
                  <span className="block text-sm font-medium mb-1.5">Hva sier skyldner?</span>
                  <textarea
                    value={form.disputeNote}
                    onChange={(e) => set("disputeNote", e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-black/15 bg-white px-4 py-3 text-base outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                  />
                </label>
                <div className="rounded-xl bg-amber-50 ring-1 ring-amber-200 p-3 text-sm">
                  Et bestridt krav går ikke i ordinær inkasso. Saken registreres, og en saksbehandler vurderer innsigelsen før noe sendes til skyldner.
                </div>
              </div>
            )}
            <label className="flex gap-3 text-sm items-start pt-2">
              <input type="checkbox" checked={form.confirmed} onChange={(e) => set("confirmed", e.target.checked)} className="mt-0.5 size-5 accent-brand-600 shrink-0" />
              <span>Jeg bekrefter at kravet er riktig, forfalt og ikke betalt utover det som står over, og at vi stopper egne purringer på fakturaen.</span>
            </label>
          </Card>

          {age !== null && age > 0 && (
            <div className="rounded-xl bg-brand-50 px-4 py-3 text-sm">
              <b>Første steg:</b> {form.disputed ? "en saksbehandler ser på innsigelsen" : noticeOk ? "betalingsoppfordring i dag" : "inkassovarsel i dag"} ·{" "}
              {age >= 60 ? "8 % provisjon (sendt 60+ dager etter forfall)" : "0 kr for deg"}
            </div>
          )}

          <ErrorBox message={error} />
          <Button type="submit" loading={loading} disabled={!form.confirmed}>
            Gå til oppsummering
          </Button>
        </form>
      )}
    </div>
  );
}
