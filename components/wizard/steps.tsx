"use client";
import { useEffect, useRef, useState } from "react";
import type { DebtCaseRow, OnboardingRow, StepKey } from "@/lib/types";
import { cleanDigits, formatAccountNumber, formatOrgNr, isEmail, isValidAccountNumber, isValidOrgNr, nok } from "@/lib/validation";
import { Badge, Button, Card, Check, ErrorBox, Input, Spinner, api, cx } from "../ui";
import { BankIdModal } from "./BankIdModal";

export type StepProps = {
  o: OnboardingRow;
  draftCase: DebtCaseRow | null;
  update: (o: OnboardingRow) => void;
  setDraftCase: (c: DebtCaseRow | null) => void;
  go: (s: StepKey) => void;
};

export function StepHeader({ title, lead }: { title: string; lead?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h1>
      {lead && <p className="mt-2 text-ink-soft">{lead}</p>}
    </div>
  );
}

function CheckRow({ ok, warn, title, detail }: { ok?: boolean; warn?: boolean; title: string; detail?: string }) {
  return (
    <div className="flex gap-3 py-2.5">
      <span
        className={cx(
          "mt-0.5 size-6 shrink-0 rounded-full grid place-items-center",
          warn ? "bg-amber-100 text-amber-700" : ok ? "bg-emerald-100 text-emerald-700" : "bg-black/5 text-ink-soft",
        )}
      >
        {warn ? <span className="font-bold text-sm">!</span> : <Check className="size-4" />}
      </span>
      <div>
        <div className="font-medium">{title}</div>
        {detail && <div className="text-sm text-ink-soft">{detail}</div>}
      </div>
    </div>
  );
}

// ---------- 1. Bedrift ----------

const DEMO_COMPANIES = [
  { orgNr: "923456783", label: "Fjellheim Rørlegger AS", tag: "Standard" },
  { orgNr: "987654325", label: "Bølgen Kafé AS", tag: "Må medsigneres" },
  { orgNr: "913579240", label: "Havbris Transport AS", tag: "Signatur i fellesskap" },
  { orgNr: "812345672", label: "Nordlys Elektro", tag: "ENK" },
  { orgNr: "934567897", label: "Gammel Handel AS", tag: "Konkurs" },
];

export function CompanyStep({ o, update, go }: StepProps) {
  const [orgNr, setOrgNr] = useState(o.orgNr ? formatOrgNr(o.orgNr) : "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(Boolean(o.company && o.status !== "blocked"));
  const [mode, setMode] = useState<"invoice" | "orgnr">(o.company && !o.prefill ? "orgnr" : "invoice");
  const [reading, setReading] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const digits = cleanDigits(orgNr);

  // Faktura først: fakturaen gir både din bedrift (avsender) og kravet
  async function readInvoice(file: File | undefined) {
    if (!file) return;
    setError(null);
    setReading(file.name);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await api<OnboardingRow>(`/api/onboarding/${o.id}/invoice-first`, fd);
      update(r);
      setOrgNr(formatOrgNr(r.orgNr ?? ""));
      setConfirmed(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setReading(null);
    }
  }

  async function lookup(value = digits) {
    setError(null);
    setConfirmed(false);
    if (!isValidOrgNr(value)) return setError("Organisasjonsnummeret er ikke gyldig. Det skal være 9 siffer.");
    setLoading(true);
    try {
      update(await api<OnboardingRow>(`/api/onboarding/${o.id}/company`, { orgNr: value }));
      setConfirmed(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const c = confirmed && o.company?.orgNr === digits ? o.company : null;
  const p = c ? o.prefill : undefined;

  return (
    <div>
      <StepHeader
        title={mode === "invoice" ? "Hvilken faktura er ikke betalt?" : "Hvilken bedrift gjelder det?"}
        lead={
          mode === "invoice"
            ? "Last opp fakturaen. Vi finner bedriften din, kunden som skylder og beløpet – og fyller ut resten."
            : "Skriv inn organisasjonsnummeret, så henter vi resten fra Brønnøysundregistrene."
        }
      />
      <div className="inline-flex rounded-xl bg-black/5 p-1 mb-5 text-sm">
        {(["invoice", "orgnr"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cx("px-4 py-2 rounded-lg font-medium", mode === m ? "bg-white shadow-sm" : "text-ink-soft")}
          >
            {m === "invoice" ? "Start med fakturaen" : "Start med org.nr"}
          </button>
        ))}
      </div>

      {mode === "invoice" && !c && (
        <div>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              readInvoice(e.dataTransfer.files[0]);
            }}
            onClick={() => fileRef.current?.click()}
            className="cursor-pointer rounded-2xl border-2 border-dashed border-brand-200 bg-white p-10 text-center hover:border-brand-400 hover:bg-brand-50 transition"
          >
            {reading ? (
              <div className="flex flex-col items-center gap-3 text-ink-soft">
                <Spinner className="size-8 text-brand-600" />
                <div>Leser {reading} og slår opp i Brønnøysundregistrene …</div>
              </div>
            ) : (
              <>
                <div className="text-lg font-semibold">Dra fakturaen hit, eller klikk for å velge fil</div>
                <div className="text-sm text-ink-soft mt-1">PDF, bilde eller EHF. Fakturaen lagres først når du har bekreftet med BankID.</div>
              </>
            )}
            <input ref={fileRef} type="file" accept=".pdf,.xml,image/*" className="hidden" onChange={(e) => readInvoice(e.target.files?.[0])} />
          </div>
          <p className="mt-2 text-xs text-ink-soft">Demo: et org.nr i filnavnet (f.eks. «faktura-987654325.pdf») blir avsender. Ellers brukes Fjellheim Rørlegger AS.</p>
        </div>
      )}

      {mode === "orgnr" && (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          lookup();
        }}
        className="flex flex-col sm:flex-row gap-3 sm:items-end"
      >
        <Input
          label="Organisasjonsnummer"
          inputMode="numeric"
          autoComplete="off"
          placeholder="123 456 789"
          value={orgNr}
          onChange={(e) => setOrgNr(e.target.value)}
          className="flex-1"
          autoFocus
        />
        <Button type="submit" loading={loading} className="sm:h-[50px]">
          Hent bedrift
        </Button>
      </form>
      )}

      {mode === "orgnr" && (
      <div className="mt-3 flex flex-wrap gap-2 items-center">
        <span className="text-xs text-ink-soft">Testbedrifter:</span>
        {DEMO_COMPANIES.map((d) => (
          <button
            key={d.orgNr}
            type="button"
            onClick={() => {
              setOrgNr(formatOrgNr(d.orgNr));
              lookup(d.orgNr);
            }}
            className="text-xs rounded-full bg-white ring-1 ring-black/10 px-3 py-1 hover:ring-brand-400"
          >
            {d.label} <span className="text-ink-soft">· {d.tag}</span>
          </button>
        ))}
      </div>
      )}

      <div className="mt-6 space-y-4">
        <ErrorBox message={error} />
        {p && (
          <Card className="p-5 animate-fade-up">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-wide text-ink-soft">Kravet</div>
                <div className="text-lg font-semibold">
                  {nok(p.invoice.amount)} fra {p.debtor.name}
                </div>
                <div className="text-sm text-ink-soft">
                  Faktura {p.invoice.number} · forfalt {new Date(p.invoice.dueDate).toLocaleDateString("nb-NO")} · lest fra {p.fileName}
                </div>
              </div>
              <Badge tone="green">{Math.round(p.confidence * 100)} % sikker</Badge>
            </div>
          </Card>
        )}
        {c && (
          <Card className="p-5 animate-fade-up">
            {p && <div className="text-xs uppercase tracking-wide text-ink-soft mb-1">Din bedrift – fra avsender på fakturaen</div>}
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-semibold">{c.name}</div>
                <div className="text-sm text-ink-soft">
                  Org.nr {formatOrgNr(c.orgNr)} · {c.orgForm}
                </div>
              </div>
              <Badge tone="green">{c.status}</Badge>
            </div>
            <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div>
                <dt className="text-ink-soft">Adresse</dt>
                <dd>
                  {c.address.street}, {c.address.postalCode} {c.address.city}
                </dd>
              </div>
              <div>
                <dt className="text-ink-soft">Bransje</dt>
                <dd>{c.naceText}</dd>
              </div>
              <div>
                <dt className="text-ink-soft">Roller</dt>
                <dd>{c.roles.map((r) => `${r.name} (${r.type.toLowerCase()})`).join(", ")}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-ink-soft">Signatur og prokura</dt>
                <dd>
                  {c.signature?.rule} {c.prokura?.rule}
                </dd>
              </div>
              <div>
                <dt className="text-ink-soft">Ansatte</dt>
                <dd>{c.employees}</dd>
              </div>
            </dl>
            <div className="mt-5 flex flex-col sm:flex-row gap-3">
              <Button onClick={() => go("identity")}>Ja, dette er min bedrift</Button>
              <Button variant="ghost" onClick={() => setConfirmed(false)}>
                Nei, endre
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

// ---------- 2. Identifisering ----------

function SignatureRow({ right, name }: { right: NonNullable<OnboardingRow["signatureRight"]>; name: string }) {
  const source = `Brønnøysundregistrene: «${right.rule.trim()}»`;
  if (right.ok && right.coSigners.length === 0) {
    return (
      <CheckRow
        ok
        title={right.basis === "prokura" ? "Prokura bekreftet – du kan signere alene" : "Signaturrett bekreftet – du kan signere alene"}
        detail={`${right.role ? `${name} er ${right.role.toLowerCase()}. ` : ""}${source}`}
      />
    );
  }
  if (right.ok) {
    return (
      <CheckRow
        warn
        title="Signatur i fellesskap"
        detail={`Du signerer, og ${right.coSigners.join(" og ")} må også signere med BankID. ${source}`}
      />
    );
  }
  return (
    <CheckRow
      warn
      title="Du har ikke signaturrett"
      detail={`Du kan fortsette. Avtalen sendes til ${right.coSigners.join(" og ")} for signering, og du får fullmakt til å sende saker. ${source}`}
    />
  );
}

export function IdentityStep({ o, update, go }: StepProps) {
  const [open, setOpen] = useState(false);
  const done = Boolean(o.signer && o.kyc);

  return (
    <div>
      <StepHeader
        title="Bekreft hvem du er"
        lead={`Vi bruker BankID for å bekrefte identiteten din og sjekke at du kan inngå avtale på vegne av ${o.company?.name}.`}
      />
      {!done ? (
        <Button onClick={() => setOpen(true)} className="w-full sm:w-auto">
          Logg inn med BankID
        </Button>
      ) : (
        <Card className="p-5 animate-fade-up">
          <div className="divide-y divide-black/5">
            <CheckRow ok title={`Identitet bekreftet: ${o.signer!.name}`} detail={`Fødselsnummer ${o.signer!.nationalIdMasked}`} />
            {o.signatureRight && <SignatureRow right={o.signatureRight} name={o.signer!.name} />}
            <CheckRow
              ok
              title="Kundekontroll (hvitvaskingsloven) godkjent"
              detail={o.kyc!.checks.map((c) => `${c.name}: ${c.result}`).join(" · ")}
            />
          </div>
          <div className="mt-5 flex gap-3">
            <Button onClick={() => go("details")}>Fortsett</Button>
            <Button variant="ghost" onClick={() => setOpen(true)}>
              Bytt bruker
            </Button>
          </div>
        </Card>
      )}
      {open && (
        <BankIdModal
          mode="login"
          onClose={() => setOpen(false)}
          onConfirm={async (personId) => {
            update(await api<OnboardingRow>(`/api/onboarding/${o.id}/identify`, { personId }));
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}

// ---------- 3. Kontakt og utbetaling ----------

// Speiler kvalifiseringen på serveren (lib/onboarding.ts)
const STANDARD_ERP_OPTIONS = ["Tripletex", "PowerOffice Go", "Visma", "Xledger", "24SevenOffice", "Fiken", "Ingen / annet enkelt"];
const ERP_OPTIONS = [...STANDARD_ERP_OPTIONS, "SAP", "Microsoft Dynamics", "Eget system"];
const SPECIAL_NEEDS = ["Tilpasset integrasjon eller filoverføring", "Flere selskaper i samme konsern", "Krav i utlandet", "Egen avtale om priser"];

export function DetailsStep({ o, update, go }: StepProps) {
  const [form, setForm] = useState({
    name: o.contact?.name ?? o.signer?.name ?? "",
    email: o.contact?.email ?? "",
    phone: o.contact?.phone ?? "",
    accountNumber: o.payout
      ? formatAccountNumber(o.payout.accountNumber)
      : o.prefill?.accountNumber
        ? formatAccountNumber(o.prefill.accountNumber)
        : "",
    erp: o.profile?.erp ?? "",
    volume: o.profile?.volume ?? "1-5",
    needs: o.profile?.needs ?? ([] as string[]),
  });
  const [suggested, setSuggested] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    api<{ accounts: string[] }>(`/api/onboarding/${o.id}/accounts`).then((r) => setSuggested(r.accounts)).catch(() => {});
  }, [o.id]);

  const set = (k: "name" | "email" | "phone" | "accountNumber") => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });
  const advisor = form.volume === "100+" || form.needs.length > 0 || (form.erp !== "" && !STANDARD_ERP_OPTIONS.includes(form.erp));
  const errors = {
    email: form.email && !isEmail(form.email) ? "Sjekk e-postadressen" : undefined,
    accountNumber:
      cleanDigits(form.accountNumber).length === 11 && !isValidAccountNumber(form.accountNumber) ? "Kontonummeret er ikke gyldig" : undefined,
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    setError(null);
    setLoading(true);
    try {
      update(await api<OnboardingRow>(`/api/onboarding/${o.id}/details`, form));
      go("agreement");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <StepHeader title="Kontaktinformasjon og utbetaling" lead="Hvem skal vi kontakte om sakene, og hvor skal pengene utbetales?" />
      <div className="grid sm:grid-cols-2 gap-4">
        <Input label="Kontaktperson" value={form.name} onChange={set("name")} autoComplete="name" className="sm:col-span-2" />
        <Input label="E-post" type="email" value={form.email} onChange={set("email")} autoComplete="email" error={touched ? errors.email : undefined} hint="Brukes til innlogging i kundeportalen og varsler om saker" />
        <Input label="Mobil" type="tel" value={form.phone} onChange={set("phone")} autoComplete="tel" placeholder="+47 900 00 000" />
        <div className="sm:col-span-2">
          <Input
            label="Kontonummer for utbetaling"
            inputMode="numeric"
            placeholder="1234.56.78903"
            value={form.accountNumber}
            onChange={set("accountNumber")}
            onBlur={() => setForm((f) => ({ ...f, accountNumber: formatAccountNumber(f.accountNumber) || f.accountNumber }))}
            error={errors.accountNumber}
          />
          {o.prefill?.accountNumber && cleanDigits(form.accountNumber) === o.prefill.accountNumber && (
            <div className="mt-2 text-xs text-emerald-700">Hentet fra fakturaen – verifiseres mot Kontoregisteret</div>
          )}
          {suggested.length > 0 && cleanDigits(form.accountNumber) !== suggested[0] && (
            <button
              type="button"
              onClick={() => setForm({ ...form, accountNumber: formatAccountNumber(suggested[0]) })}
              className="mt-2 text-sm text-brand-700 hover:underline text-left"
            >
              Bruk {formatAccountNumber(suggested[0])} – registrert på {o.company?.name} i Kontoregisteret
            </button>
          )}
        </div>
      </div>

      <Card className="mt-6 p-5 space-y-4">
        <div>
          <h2 className="font-semibold">Om bedriften</h2>
          <p className="text-sm text-ink-soft">Tre raske spørsmål, så vet vi om standardløsningen passer – eller om en rådgiver bør ta kontakt.</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="block text-sm font-medium mb-1.5">Regnskapssystem</span>
            <select
              value={form.erp}
              onChange={(e) => setForm({ ...form, erp: e.target.value })}
              className="w-full rounded-xl border border-black/15 bg-white px-4 py-3 text-base outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
            >
              <option value="">Velg …</option>
              {ERP_OPTIONS.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="block text-sm font-medium mb-1.5">Omtrent hvor mange saker i måneden?</span>
            <select
              value={form.volume}
              onChange={(e) => setForm({ ...form, volume: e.target.value as typeof form.volume })}
              className="w-full rounded-xl border border-black/15 bg-white px-4 py-3 text-base outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
            >
              <option value="1-5">1–5</option>
              <option value="6-20">6–20</option>
              <option value="21-100">21–100</option>
              <option value="100+">Over 100</option>
            </select>
          </label>
        </div>
        <fieldset>
          <legend className="text-sm font-medium mb-2">Har dere behov for noe av dette? (valgfritt)</legend>
          <div className="grid sm:grid-cols-2 gap-2">
            {SPECIAL_NEEDS.map((n) => (
              <label key={n} className="flex gap-2 items-start text-sm">
                <input
                  type="checkbox"
                  checked={form.needs.includes(n)}
                  onChange={(e) => setForm({ ...form, needs: e.target.checked ? [...form.needs, n] : form.needs.filter((x) => x !== n) })}
                  className="mt-0.5 size-4 accent-brand-600"
                />
                {n}
              </label>
            ))}
          </div>
        </fieldset>
        {advisor && (
          <div className="rounded-xl bg-brand-50 p-3 text-sm animate-fade-up">
            En rådgiver kontakter deg innen 1 virkedag for å sette opp det dere trenger. Du kan likevel fullføre og sende første sak nå.
          </div>
        )}
      </Card>

      <div className="mt-6 space-y-4">
        <ErrorBox message={error} />
        <Button type="submit" loading={loading}>
          Fortsett
        </Button>
      </div>
    </form>
  );
}

// ---------- 4. Avtale ----------

export function AgreementStep({ o, update, go }: StepProps) {
  const [accepted, setAccepted] = useState(Boolean(o.agreement));
  const [open, setOpen] = useState(false);
  const right = o.signatureRight;
  const coSigners = right?.coSigners ?? [];
  // Alle som må signere etter Brønnøysund, i rekkefølge
  const signers = [...(right?.ok ? [o.signer?.name ?? ""] : []), ...coSigners].filter(Boolean);
  const signerLabel = signers.join(" og ");

  if (o.agreement) {
    return (
      <div>
        <StepHeader title="Avtalen er signert" />
        <Card className="p-5">
          <CheckRow
            ok
            title={`${o.agreement.package} signert av ${o.agreement.signedBy}`}
            detail={`${new Date(o.agreement.signedAt).toLocaleString("nb-NO")} · BankID-referanse ${o.agreement.reference}`}
          />
          <Button className="mt-4" onClick={() => go(o.channel ? "submit" : "case")}>
            {o.channel ? "Fortsett" : "Fortsett til første sak"}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <StepHeader title="Avtale" lead="Intrum Optimal er standardavtalen for små og mellomstore bedrifter – samme tjeneste for alle, uten tilbudsrunde." />
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div className="font-semibold text-lg">Intrum Optimal</div>
          <Badge>Fiktive vilkår</Badge>
        </div>
        <ul className="mt-4 grid sm:grid-cols-2 gap-2 text-sm">
          {[
            "Inkassovarsel og betalingsoppfordring",
            "Oppfølging av skyldner på telefon, SMS og e-post",
            "Avtale om nedbetaling på dine vegne",
            "Rettslig inkasso ved behov",
            "Kundeportal med status på alle saker",
            "Utbetaling til konto når skyldner betaler",
          ].map((t) => (
            <li key={t} className="flex gap-2">
              <Check className="size-4 mt-0.5 text-brand-600 shrink-0" />
              {t}
            </li>
          ))}
        </ul>
        <div className="mt-5 rounded-xl bg-brand-50 p-4 text-sm">
          <div className="font-medium">Pris</div>
          <p className="text-ink-soft mt-1">
            Ingen etablerings- eller månedskostnad. Inkassosalær kreves inn fra skyldner etter inkassoforskriften. Fiktiv prismodell for prototypen.
          </p>
        </div>
        <label className="mt-5 flex gap-3 text-sm items-start">
          <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5 size-5 accent-brand-600" />
          <span>
            Jeg har lest og godtar <span className="underline">avtalevilkårene</span> og <span className="underline">personvernerklæringen</span>.
          </span>
        </label>
        {coSigners.length > 0 && (
          <div className="mt-4 rounded-xl bg-amber-50 ring-1 ring-amber-200 p-4 text-sm">
            {right?.ok
              ? `Signaturen er «${right.rule.trim()}». Du signerer først, så får ${coSigners.join(" og ")} en lenke på e-post og signerer med BankID.`
              : `Du har ikke signaturrett. ${coSigners.join(" og ")} får en lenke på e-post og signerer med BankID. Avtalen gir deg fullmakt til å sende saker.`}
          </div>
        )}
        <Button className="mt-5 w-full sm:w-auto" disabled={!accepted} onClick={() => setOpen(true)}>
          {coSigners.length === 0 ? "Signer med BankID" : right?.ok ? `Signer og send til ${coSigners.join(" og ")}` : `Send til signering hos ${coSigners.join(" og ")}`}
        </Button>
      </Card>
      {open && (
        <BankIdModal
          mode="sign"
          signerName={signerLabel}
          documentTitle="Intrum Optimal – avtale"
          onClose={() => setOpen(false)}
          onConfirm={async () => {
            update(await api<OnboardingRow>(`/api/onboarding/${o.id}/sign`));
            setOpen(false);
            go(o.channel ? "submit" : "case");
          }}
        />
      )}
    </div>
  );
}
