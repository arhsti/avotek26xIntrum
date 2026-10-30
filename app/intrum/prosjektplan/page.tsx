import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Prosjektplan – Intrum SMB-onboarding (prototype)" };

// ---------- Dagens prosess (fra Intrums prosesskart og presentasjon) ----------

const PHASES = ["Henvendelse og behov", "Kartlegging og vurdering", "Tilbud og avtale", "Implementering", "Testing og aktivering", "Drift og oppfølging"];

type Cell = { text: string; decision?: boolean; pain?: string }[];

const LANES: { role: string; cells: Cell[] }[] = [
  {
    role: "Kunde",
    cells: [
      [{ text: "Tar kontakt via nettside, partner eller som eksisterende kunde" }],
      [{ text: "Svarer på spørsmål om ERP, volum og krav" }],
      [{ text: "Aksepterer tilbud og signerer avtalen", pain: "PDF / papir" }],
      [{ text: "Gir tilganger og deltar i oppsett" }],
      [{ text: "Sender test-saker" }, { text: "Får opplæring" }, { text: "Sender første reelle sak", pain: "Lang ledetid" }],
      [{ text: "Følger saker i portalen", pain: "Vanskelig å aktivere" }],
    ],
  },
  {
    role: "Salg / Partnerskap",
    cells: [
      [{ text: "Registrerer lead/case i Salesforce", pain: "Manuelt" }, { text: "Tildeler ansvarlig" }],
      [{ text: "Kartlegger behov og forutsetninger" }, { text: "Egnet for standard integrasjon?", decision: true }, { text: "Nei → tilpasset løsning / prosjekt" }],
      [{ text: "Utarbeider tilbud (SMB-pakke, tillegg, tidsplan)" }, { text: "Oppretter sak og overleverer til teknisk", pain: "Overlevering" }],
      [],
      [],
      [{ text: "Utvikler videre bruk" }],
    ],
  },
  {
    role: "Teknisk team",
    cells: [
      [],
      [{ text: "Vurderer tekniske krav" }],
      [],
      [{ text: "Kick-off, tilgang og rettigheter" }, { text: "Oppsett av API/connector og mapping i kundens ERP", pain: "Per kunde" }, { text: "Intern kvalitetssikring" }],
      [{ text: "Test godkjent?", decision: true }, { text: "Nei → feilsøking og justering" }, { text: "Aktiverer i produksjon" }],
      [{ text: "Overvåker dataflyt" }],
    ],
  },
  {
    role: "Kundesupport",
    cells: [
      [],
      [],
      [],
      [{ text: "Registrerer kunden i Pink og kundeportalen", pain: "Manuelt · personavhengig" }],
      [{ text: "Aktivering, velkomst og opplæring", pain: "Manuelt" }],
      [{ text: "Support ved behov" }, { text: "Proaktiv oppfølging" }],
    ],
  },
  {
    role: "Systemer",
    cells: [
      [{ text: "Salesforce: lead" }],
      [],
      [{ text: "Salesforce: tilbud og avtale" }],
      [{ text: "Pink og kundeportal (manuell registrering)" }],
      [{ text: "ERP-integrasjon (ofte filbasert)" }],
      [{ text: "Pink, kundeportal" }],
    ],
  },
];

// ---------- Plan ----------

const START = { year: 2026, month: 10 }; // november 2026 (0-indeksert)
const MONTHS = Array.from({ length: 14 }, (_, i) => {
  const d = new Date(START.year, START.month + i, 1);
  return d.toLocaleDateString("nb-NO", { month: "short" }).replace(".", "") + (d.getMonth() === 0 || i === 0 ? ` ${String(d.getFullYear()).slice(2)}` : "");
});

// start/slutt i måneder fra november 2026
const STREAMS: { name: string; owner: string; bars: { from: number; to: number; label: string; tone: "brand" | "sky" | "amber" | "gray"; later?: boolean }[] }[] = [
  { name: "Forberedelse", owner: "Intrum", bars: [{ from: 0, to: 2, label: "BankID-avtale, tilganger, juridisk", tone: "amber" }] },
  { name: "Skjema og integrasjon", owner: "Avo – 3 personer, 8 uker", bars: [{ from: 2, to: 4, label: "Skjema, Brønnøysund, BankID, Salesforce", tone: "brand" }] },
  { name: "Pilot og drift", owner: "Intrum + Avo", bars: [{ from: 4, to: 6, label: "Pilot", tone: "gray" }, { from: 6, to: 14, label: "Ny flyt for nye SMB-kunder", tone: "gray" }] },
  { name: "Tillegg A: Pink og portal", owner: "Senere – prises da", bars: [{ from: 6, to: 9, label: "Pink-adapter, portal, oppfølging", tone: "sky", later: true }] },
  { name: "Fase 2: ERP-partnere", owner: "Prosjektbasert", bars: [{ from: 9, to: 14, label: "Partner-API, Tripletex først", tone: "sky", later: true }] },
  { name: "Måling", owner: "Analyse", bars: [{ from: 0, to: 2, label: "Baseline", tone: "gray" }, { from: 4, to: 14, label: "KPI-er i drift", tone: "gray" }] },
];

const MILESTONES = [
  { at: 2, label: "M1 Oppstart" },
  { at: 4, label: "M2 I produksjon" },
  { at: 6, label: "M3 Etter pilot" },
];

const PLAN_PHASES = [
  {
    n: 0,
    name: "Forberedelse",
    when: "nov–des 2026",
    goal: "Alt klart til uke 1",
    deliver: ["BankID-leverandør og avtale", "Tilganger til Azure, MuleSoft og Salesforce", "Juridisk avklaring og KPI-baseline"],
    phases: "Alle",
    done: "Oppstart (M1)",
  },
  {
    n: 1,
    name: "Skjema og integrasjon",
    when: "8 uker · jan–feb 2027",
    goal: "Nye SMB-kunder blir kunde og sender første sak samme dag",
    deliver: ["Skjema på intrum.no med faktura først", "Brønnøysund og BankID med signaturforslag", "Kravkontroll og Salesforce automatisk – Pink via kø"],
    phases: "1–3, 5",
    done: "I produksjon med pilot (M2)",
  },
  {
    n: 2,
    name: "Tillegg A: Pink og portal",
    when: "Senere",
    goal: "Ingen manuelle steg etter signering",
    deliver: ["Pink-adapter for klient og sak", "Portal med BankID og tidslinje", "Oppfølgingsliste"],
    phases: "4, 6",
    done: "Avtales når fase 1 er i drift",
  },
  {
    n: 3,
    name: "Fase 2: ERP-partnere",
    when: "Prosjektbasert",
    goal: "ERP-kunder aktiverer selv",
    deliver: ["Partner-API i MuleSoft", "Tripletex fra fil til API", "Status tilbake til ERP"],
    phases: "4–6",
    done: "Per partner",
  },
];

const TONE = {
  brand: "bg-brand-500 text-white",
  sky: "bg-sky-500 text-white",
  amber: "bg-amber-400 text-amber-950",
  gray: "bg-stone-400 text-white",
};

const pct = (m: number) => `${(m / MONTHS.length) * 100}%`;

export default function Page() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Prosjektplan</h1>
        <p className="mt-2 text-ink-soft max-w-3xl">Dagens prosess slik den er beskrevet i Intrums prosesskart, og en konkret plan for å komme til ny flyt. Datoene er et forslag til diskusjon.</p>
      </div>

      {/* Dagens prosess */}
      <section>
        <h2 className="text-xl font-semibold">Dagens prosess</h2>
        <p className="text-sm text-ink-soft mt-1">Fra henvendelse til aktiv integrasjon og første sak. Markert = smertepunkt fra presentasjonen.</p>
        <div className="mt-4 overflow-x-auto rounded-2xl bg-white ring-1 ring-black/5">
          <div className="min-w-[1000px] grid" style={{ gridTemplateColumns: "140px repeat(6, minmax(0, 1fr))" }}>
            <div className="bg-canvas" />
            {PHASES.map((p, i) => (
              <div key={p} className="bg-ink text-white px-3 py-2.5 text-xs font-semibold border-l border-white/10">
                {i + 1}. {p}
              </div>
            ))}
            {LANES.map((lane, li) => (
              <div key={lane.role} className="contents">
                <div className={`px-3 py-3 text-xs font-semibold uppercase tracking-wide ${li % 2 ? "bg-canvas" : "bg-white"} border-t border-black/5`}>{lane.role}</div>
                {lane.cells.map((cell, ci) => (
                  <div key={ci} className={`p-2 space-y-1.5 border-t border-l border-black/5 ${li % 2 ? "bg-canvas" : "bg-white"}`}>
                    {cell.map((step) =>
                      step.decision ? (
                        <div key={step.text} className="flex items-center gap-1.5 text-xs font-medium">
                          <span className="size-3 rotate-45 bg-brand-400 shrink-0" aria-hidden />
                          {step.text}
                        </div>
                      ) : (
                        <div key={step.text} className={`rounded-lg px-2 py-1.5 text-xs leading-snug ${step.pain ? "bg-amber-50 ring-1 ring-amber-300" : "bg-white ring-1 ring-black/10"}`}>
                          {step.text}
                          {step.pain && <span className="block text-[10px] font-semibold text-amber-800 mt-0.5">{step.pain}</span>}
                        </div>
                      ),
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3 grid sm:grid-cols-3 gap-3 text-sm">
          <div className="rounded-xl bg-white ring-1 ring-black/5 p-4">
            <div className="font-semibold">4 roller, 5 overleveringer</div>
            <div className="text-ink-soft">Kunden går mellom salg, teknisk team og kundesupport før første sak.</div>
          </div>
          <div className="rounded-xl bg-white ring-1 ring-black/5 p-4">
            <div className="font-semibold">Første sak kommer sist</div>
            <div className="text-ink-soft">Kravet kunden kom med, sendes først etter avtale, oppsett og test.</div>
          </div>
          <div className="rounded-xl bg-white ring-1 ring-black/5 p-4">
            <div className="font-semibold">Pink og portal manuelt</div>
            <div className="text-ink-soft">Personavhengig og feilutsatt, og portalaktivering skaper friksjon.</div>
          </div>
        </div>
        <p className="mt-3 text-sm">
          <Link href="/intrum/prosess" className="font-semibold text-brand-700 hover:underline">
            Se hvordan hver fase løses i ny flyt →
          </Link>
        </p>
      </section>

      {/* Tidslinje */}
      <section>
        <h2 className="text-xl font-semibold">Plan nov 2026 – des 2027</h2>
        <p className="text-sm text-ink-soft mt-1">Fase 1 er 8 uker med Avo. Stiplet = tillegg og fase 2, som avtales senere.</p>
        <div className="mt-4 overflow-x-auto rounded-2xl bg-white ring-1 ring-black/5 p-4">
          <div className="min-w-[960px]">
            <div className="grid" style={{ gridTemplateColumns: "220px 1fr" }}>
              <div />
              <div className="grid text-[11px] text-ink-soft" style={{ gridTemplateColumns: `repeat(${MONTHS.length}, minmax(0, 1fr))` }}>
                {MONTHS.map((m) => (
                  <div key={m} className="border-l border-black/10 pl-1.5 pb-1 capitalize">
                    {m}
                  </div>
                ))}
              </div>
              {STREAMS.map((s) => (
                <div key={s.name} className="contents">
                  <div className="py-2 pr-3 border-t border-black/5">
                    <div className="text-sm font-medium leading-tight">{s.name}</div>
                    <div className="text-[11px] text-ink-soft">{s.owner}</div>
                  </div>
                  <div className="relative border-t border-black/5 h-[52px]">
                    {s.bars.map((b) => (
                      <div
                        key={b.label}
                        className={`absolute top-1/2 -translate-y-1/2 h-7 rounded-md px-2 text-[11px] font-medium flex items-center overflow-hidden whitespace-nowrap ${
                          b.later ? "border-2 border-dashed border-sky-400 bg-sky-50 text-sky-900" : TONE[b.tone]
                        }`}
                        style={{ left: pct(b.from), width: pct(b.to - b.from) }}
                        title={b.label}
                      >
                        {b.label}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div className="pt-3 text-sm font-medium border-t border-black/10">Milepæler</div>
              <div className="relative h-16 border-t border-black/10">
                {MILESTONES.map((m, i) => (
                  <div
                    key={m.label}
                    className="absolute flex flex-col -translate-x-1/2 items-center"
                    style={{ left: pct(m.at), top: i % 2 ? 30 : 8 }}
                  >
                    <span className="size-3 rotate-45 bg-ink" aria-hidden />
                    <span className="mt-1 text-[11px] font-semibold whitespace-nowrap">{m.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Faser */}
      <section>
        <h2 className="text-xl font-semibold">Faser</h2>
        <div className="mt-4 grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLAN_PHASES.map((p) => (
            <div key={p.n} className="rounded-2xl bg-white ring-1 ring-black/5 p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold text-brand-700">Fase {p.n} · {p.when}</div>
                  <div className="font-semibold text-lg">{p.name}</div>
                </div>
                <span className="text-[11px] rounded-full bg-canvas px-2 py-0.5 text-ink-soft whitespace-nowrap">Prosessfase {p.phases}</span>
              </div>
              <div className="text-sm">{p.goal}</div>
              <ul className="text-sm text-ink-soft space-y-1">
                {p.deliver.map((d) => (
                  <li key={d}>• {d}</li>
                ))}
              </ul>
              <div className="mt-auto text-xs rounded-lg bg-brand-50 px-3 py-2">
                <b>Ferdig når:</b> {p.done}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-amber-50 ring-1 ring-amber-200 p-6 text-sm">
        <h2 className="font-semibold text-lg">Avhengigheter og risiko</h2>
        <ul className="mt-3 grid md:grid-cols-2 gap-x-8 gap-y-2">
          <li>• Pink er manuelt (via kø) til tillegg A er på plass</li>
          <li>• BankID-avtale og juridisk avklaring må være klare før uke 1</li>
          <li>• Partnere må prioritere å bygge mot API-et – start med Tripletex i fase 2</li>
          <li>• Migrering fra Pink on-prem til Azure kan flytte System API-et</li>
        </ul>
      </section>
    </div>
  );
}
