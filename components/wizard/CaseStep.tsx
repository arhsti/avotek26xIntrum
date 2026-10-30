"use client";
import { useRef, useState } from "react";
import type { DebtCase, DebtCaseRow } from "@/lib/types";
import { cleanDigits, formatOrgNr, isValidOrgNr } from "@/lib/validation";
import { Badge, Button, Card, ErrorBox, Input, Spinner, api, cx } from "../ui";
import { StepHeader, type StepProps } from "./steps";

type Form = {
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
  reminderAlreadySent: boolean;
};

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

function fromCase(c: DebtCaseRow | null): Form {
  return {
    debtorType: c?.debtor.type ?? "company",
    debtorOrgNr: c?.debtor.orgNr ? formatOrgNr(c.debtor.orgNr) : "",
    debtorName: c?.debtor.name ?? "",
    debtorAddress: c?.debtor.address ?? "",
    debtorEmail: c?.debtor.email ?? "",
    invoiceNumber: c?.invoice.number ?? "",
    issueDate: c?.invoice.issueDate ?? "",
    dueDate: c?.invoice.dueDate ?? "",
    amount: c ? String(c.invoice.amount).replace(".", ",") : "",
    description: c?.invoice.description ?? "",
    reminderAlreadySent: c?.reminderAlreadySent ?? false,
  };
}

type OcrResult = { confidence: number; debtor: DebtCase["debtor"]; invoice: DebtCase["invoice"] };

export function CaseStep({ o, draftCase, setDraftCase, go }: StepProps) {
  const [form, setForm] = useState<Form>(fromCase(draftCase));
  const [mode, setMode] = useState<"upload" | "manual">(draftCase ? "manual" : "upload");
  const [source, setSource] = useState<"manual" | "ocr">(draftCase?.source === "ocr" ? "ocr" : "manual");
  const [ocrState, setOcrState] = useState<{ loading: boolean; fileName?: string; confidence?: number }>({ loading: false });
  const [debtorLookup, setDebtorLookup] = useState<"idle" | "loading" | "found">(draftCase?.debtor.orgNr ? "found" : "idle");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setOcrState({ loading: true, fileName: file.name });
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await api<OcrResult>(`/api/onboarding/${o.id}/ocr`, fd);
      setForm({
        debtorType: r.debtor.type,
        debtorOrgNr: r.debtor.orgNr ? formatOrgNr(r.debtor.orgNr) : "",
        debtorName: r.debtor.name,
        debtorAddress: r.debtor.address ?? "",
        debtorEmail: "",
        invoiceNumber: r.invoice.number,
        issueDate: r.invoice.issueDate,
        dueDate: r.invoice.dueDate,
        amount: String(r.invoice.amount).replace(".", ","),
        description: r.invoice.description ?? "",
        reminderAlreadySent: false,
      });
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
    setForm({
      debtorType: "company",
      debtorOrgNr: "975 312 461",
      debtorName: "Vestkyst Eiendom AS",
      debtorAddress: "Strandkaien 20, 4005 Stavanger",
      debtorEmail: "",
      invoiceNumber: "20431",
      issueDate: daysAgo(58),
      dueDate: daysAgo(44),
      amount: "18 750,00",
      description: "Utskifting av varmtvannsbereder",
      reminderAlreadySent: false,
    });
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
        reminderAlreadySent: form.reminderAlreadySent,
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
          amount: Number(form.amount.replace(/\s/g, "").replace(",", ".")),
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
      <StepHeader title="Send din første sak" lead="Last opp den ubetalte fakturaen, så fyller vi ut resten. Du kan også fylle inn selv." />

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
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Hvem skylder penger?</h2>
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
                <Input label="Adresse" value={form.debtorAddress} onChange={(e) => set("debtorAddress", e.target.value)} className="sm:col-span-2" />
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                <Input label="Fullt navn" value={form.debtorName} onChange={(e) => set("debtorName", e.target.value)} />
                <Input label="E-post (valgfritt)" type="email" value={form.debtorEmail} onChange={(e) => set("debtorEmail", e.target.value)} />
                <Input label="Adresse" value={form.debtorAddress} onChange={(e) => set("debtorAddress", e.target.value)} className="sm:col-span-2" />
              </div>
            )}
          </Card>

          <Card className="p-5 space-y-4">
            <h2 className="font-semibold">Fakturaen</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Input label="Fakturanummer" value={form.invoiceNumber} onChange={(e) => set("invoiceNumber", e.target.value)} />
              <Input label="Beløp inkl. mva (kr)" inputMode="decimal" value={form.amount} onChange={(e) => set("amount", e.target.value)} />
              <Input label="Fakturadato" type="date" value={form.issueDate} onChange={(e) => set("issueDate", e.target.value)} />
              <Input label="Forfallsdato" type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} max={daysAgo(1)} />
              <Input label="Beskrivelse (valgfritt)" value={form.description} onChange={(e) => set("description", e.target.value)} className="sm:col-span-2" />
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="font-semibold mb-3">Har du sendt inkassovarsel?</h2>
            <div className="space-y-2">
              {[
                { v: false, t: "Nei – Intrum sender inkassovarsel for meg", d: "Skyldner får 14 dagers frist før saken går videre. Anbefalt." },
                { v: true, t: "Ja, inkassovarsel er sendt og fristen har gått ut", d: "Vi sender betalingsoppfordring med en gang." },
              ].map((opt) => (
                <label
                  key={String(opt.v)}
                  className={cx(
                    "flex gap-3 rounded-xl p-3 ring-1 cursor-pointer",
                    form.reminderAlreadySent === opt.v ? "ring-brand-500 bg-brand-50" : "ring-black/10",
                  )}
                >
                  <input type="radio" name="reminder" checked={form.reminderAlreadySent === opt.v} onChange={() => set("reminderAlreadySent", opt.v)} className="mt-1 accent-brand-600" />
                  <span>
                    <span className="block font-medium text-sm">{opt.t}</span>
                    <span className="block text-xs text-ink-soft">{opt.d}</span>
                  </span>
                </label>
              ))}
            </div>
          </Card>

          <ErrorBox message={error} />
          <Button type="submit" loading={loading}>
            Gå til oppsummering
          </Button>
        </form>
      )}
    </div>
  );
}
