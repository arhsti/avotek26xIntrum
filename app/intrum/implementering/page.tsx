import type { Metadata } from "next";

export const metadata: Metadata = { title: "Implementering med Avo – Intrum (prototype)" };

// ---------- Team og plan ----------

const TEAM = [
  { role: "Tech lead – arkitektur, Azure og .NET", note: "Også kontaktpunkt mot Intrum" },
  { role: "Fullstack-utvikler – .NET og React", note: "Skjemaet og BFF" },
  { role: "Integrasjonsutvikler – MuleSoft", note: "Brønnøysund, BankID, Salesforce" },
];

const AI_WAYS = [
  "Prototypen er spesifikasjonen: flyt, datamodell, regler og tester finnes allerede",
  "AI-assistert utvikling av kode, tester og API-kontrakter – mennesker reviewer og eier alt som går i produksjon",
  "Testene fra prototypen kjøres automatisk mot hver versjon",
  "Ingen kundedata i AI-verktøyene, og Intrums retningslinjer for kode og sikkerhet følges",
];

const INTRUM_ROLES = ["Produkteier (beslutter og prioriterer)", "MuleSoft-plattformteam", "Juridisk og compliance", "Digital Sales (pilot og unntak)", "Sikkerhet og personvern"];

const PREP = ["BankID-leverandør og avtale", "Tilganger til Azure, MuleSoft og Salesforce", "Juridisk avklaring av digital signering og fullmakt", "Pilotkunder og KPI-baseline"];

const WEEKS = 8;

const SPRINTS: { from: number; to: number; name: string; deliver: string[] }[] = [
  {
    from: 0,
    to: 2,
    name: "Fundament og Brønnøysund",
    deliver: ["Skjemaet på intrum.no med faktura først", ".NET-backend og miljøer i Azure", "Brønnøysund System API i MuleSoft: enhet og roller"],
  },
  {
    from: 2,
    to: 4,
    name: "BankID og signering",
    deliver: ["BankID-innlogging", "Signaturforslag fra Brønnøysund", "Signering alene, i fellesskap og med fullmakt", "Kundekontroll (KYC)"],
  },
  {
    from: 4,
    to: 6,
    name: "Første sak og Salesforce",
    deliver: ["Saksskjema med kravkontroll", "Kunde, avtale og oppgaver automatisk i Salesforce", "Kø mot Pink – registreres med dagens rutine til tillegg A er på plass"],
  },
  {
    from: 6,
    to: 8,
    name: "Test og pilot",
    deliver: ["Ende-til-ende-tester, sikkerhet og universell utforming", "Måling av trakt og tid til første sak", "Produksjonssetting og pilot"],
  },
];

// Senere faser – ikke en del av de 8 ukene, prises når de er aktuelle
const ADDONS: { tag: string; name: string; goal: string; deliver: string[]; how: string }[] = [
  {
    tag: "Tillegg A",
    name: "Pink og portal automatisk",
    goal: "Ingen manuelle steg etter signering",
    deliver: ["Pink-adapter for klient og sak", "Kundeportal med BankID-innlogging og tidslinje", "Oppfølgingsliste for kundesupport"],
    how: "Når skjema og integrasjon er i drift. Trenger Pink-teamets importformat og testmiljø",
  },
  {
    tag: "Fase 2",
    name: "ERP-partnere",
    goal: "ERP-kunder aktiverer selv og sender saker via API",
    deliver: ["Partner-API i MuleSoft", "Tripletex fra fil til API", "Status tilbake til ERP"],
    how: "Prosjektbasert per partner – start med Tripletex",
  },
];

function Section({ id, title, lead, h1, children }: { id: string; title: string; lead?: string; h1?: boolean; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6">
      {h1 ? <h1 className="text-3xl font-bold tracking-tight">{title}</h1> : <h2 className="text-xl font-semibold">{title}</h2>}
      {lead && <p className="mt-1 text-sm text-ink-soft max-w-3xl">{lead}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function Page() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Section id="plan" title="Plan: 8 uker med 3 personer" lead="Skjema og integrasjon for nye kunder. Avo-teamet bruker AI-assistert utvikling, med prototypen som utgangspunkt – derfor holder et lite team og kort tid." h1>
        <div className="grid lg:grid-cols-[1fr_300px] gap-5 items-start">
          <div className="space-y-4 min-w-0">
            <div className="rounded-2xl bg-white ring-1 ring-black/5 p-5 overflow-x-auto">
              <div className="min-w-[640px]">
                <div className="grid text-[11px] text-ink-soft mb-2" style={{ gridTemplateColumns: `repeat(${WEEKS}, minmax(0, 1fr))` }}>
                  {Array.from({ length: WEEKS }, (_, w) => (
                    <div key={w} className="border-l border-black/10 pl-1.5">
                      Uke {w + 1}
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  {SPRINTS.map((sp, i) => (
                    <div key={sp.name} className="relative h-9">
                      <div
                        className="absolute inset-y-0 rounded-lg bg-brand-600 text-white px-3 flex items-center text-xs font-medium whitespace-nowrap overflow-hidden"
                        title={sp.name}
                        style={{ left: `${(sp.from / WEEKS) * 100}%`, width: `${((sp.to - sp.from) / WEEKS) * 100}%` }}
                      >
                        <span className="truncate">Sprint {i + 1}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {SPRINTS.map((sp, i) => (
                <div key={sp.name} className="rounded-xl bg-white ring-1 ring-black/5 p-4">
                  <div className="text-xs font-semibold text-brand-700">
                    Uke {sp.from + 1}–{sp.to} · Sprint {i + 1}
                  </div>
                  <div className="font-semibold">{sp.name}</div>
                  <ul className="mt-2 space-y-1 text-sm text-ink-soft">
                    {sp.deliver.map((d) => (
                      <li key={d}>• {d}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="rounded-xl bg-canvas p-4 text-sm">
              <b>Før uke 1 (Intrum):</b> {PREP.join(" · ")}
            </div>
          </div>
          <aside className="space-y-4">
            <div className="rounded-2xl bg-ink text-white p-5">
              <div className="font-semibold">Avo-team: 3 personer</div>
              <ul className="mt-3 space-y-3 text-sm">
                {TEAM.map((t) => (
                  <li key={t.role}>
                    <div>{t.role}</div>
                    <div className="text-xs text-brand-200">{t.note}</div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl bg-white ring-1 ring-black/5 p-5">
              <div className="font-semibold">AI-assistert utvikling</div>
              <ul className="mt-2 space-y-1.5 text-sm text-ink-soft">
                {AI_WAYS.map((r) => (
                  <li key={r}>• {r}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl bg-white ring-1 ring-black/5 p-5">
              <div className="font-semibold">Fra Intrum</div>
              <ul className="mt-2 space-y-1.5 text-sm text-ink-soft">
                {INTRUM_ROLES.map((r) => (
                  <li key={r}>• {r}</li>
                ))}
              </ul>
            </div>
          </aside>
        </div>

        <div className="mt-6">
          <h3 className="font-semibold">Tillegg – senere faser</h3>
          <p className="text-sm text-ink-soft">Ikke en del av de 8 ukene. Kan gjøres når skjema og integrasjon for nye kunder er i drift, og prises da.</p>
          <div className="mt-3 grid md:grid-cols-2 gap-4">
            {ADDONS.map((a) => (
              <div key={a.name} className="rounded-2xl border-2 border-dashed border-brand-200 bg-white p-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-brand-100 text-brand-700 px-2.5 py-0.5 text-xs font-semibold">{a.tag}</span>
                  <span className="text-xs text-ink-soft">Pris avtales senere</span>
                </div>
                <div className="mt-2 font-semibold text-lg">{a.name}</div>
                <div className="text-sm text-ink-soft">{a.goal}</div>
                <ul className="mt-2 space-y-1 text-sm">
                  {a.deliver.map((d) => (
                    <li key={d}>• {d}</li>
                  ))}
                </ul>
                <div className="mt-3 text-xs text-ink-soft">{a.how}</div>
              </div>
            ))}
          </div>
        </div>
      </Section>
    </div>
  );
}
