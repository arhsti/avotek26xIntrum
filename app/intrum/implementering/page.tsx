import type { Metadata } from "next";
import { GoalStats } from "@/components/GoalStats";

export const metadata: Metadata = { title: "Implementering med Avo – Intrum (prototype)" };

// ---------- Målarkitektur på Intrums stack ----------

const LAYERS: { name: string; items: { t: string; d: string; tag?: string }[] }[] = [
  {
    name: "Kanaler",
    items: [
      { t: "SMB-skjema på intrum.no", d: "Egen onboarding-app (React) bygget inn på bedriftssidene, erstatter Pardot-skjemaet «Bli kunde»", tag: "Ny" },
      { t: "Kundeportal", d: "Tidslinje, meldinger og tilganger – innlogging med BankID", tag: "Utvides" },
      { t: "ERP-partnere", d: "Tripletex, PowerOffice m.fl. via Partner-API", tag: "Ny" },
    ],
  },
  {
    name: "Azure (.NET)",
    items: [
      { t: "Onboarding-BFF", d: ".NET 8 API i App Service / Container Apps. Holder tilstand per registrering i Azure SQL", tag: "Ny" },
      { t: "Workers", d: "Azure Functions / Container Apps-jobber på Azure Service Bus: provisjonering med retry og idempotens", tag: "Ny" },
      { t: "Faktura-tolkning", d: "Azure AI Document Intelligence (ferdig fakturamodell)", tag: "Ny" },
      { t: "Drift", d: "Key Vault, Application Insights, alarmer og KPI-dashboard", tag: "Gjenbruk" },
    ],
  },
  {
    name: "MuleSoft",
    items: [
      { t: "Experience API-er", d: "Onboarding-API, Partner-API, Portal-API", tag: "Ny" },
      { t: "Process API-er", d: "Kundeonboarding, signaturforslag, kravkontroll, saksstatus", tag: "Ny" },
      { t: "System API-er", d: "Brønnøysund, BankID, KYC/AML, Kontoregisteret, Salesforce, Pink-adapter", tag: "Ny / gjenbruk" },
    ],
  },
  {
    name: "Kjernesystemer",
    items: [
      { t: "Pink", d: "Fase 1: adapter mot dagens import (kø/batch). Fase 2: System API når Pink er i Azure", tag: "Adapter" },
      { t: "Salesforce", d: "Kunde, avtale, kanal og oppgaver til rådgiver", tag: "Gjenbruk" },
    ],
  },
];

// ---------- Integrasjoner ----------

const BRREG = [
  { k: "Enhet", v: "GET data.brreg.no/enhetsregisteret/api/enheter/{orgnr}", d: "Navn, organisasjonsform, adresse, næringskode, konkurs og avvikling" },
  { k: "Roller", v: "GET …/enheter/{orgnr}/roller", d: "Daglig leder, styre, innehaver, signatur og prokura – med navn og fødselsdato" },
  { k: "Endringer", v: "GET …/oppdateringer/enheter og …/roller", d: "Overvåking av rolle- og statusendringer for kundene våre" },
];

const BANKID = [
  { k: "Innlogging", d: "OpenID Connect (authorization code + PKCE). Gir navn og fødselsdato for matching mot roller i Brønnøysund" },
  { k: "Signering", d: "Intrum Optimal signeres med BankID (PAdES). Flere signatarer i samme ordre ved signatur i fellesskap" },
  { k: "Fullmakt", d: "Signaturberettiget godkjenner fullmektig med BankID – samme signeringstjeneste" },
  { k: "Portal", d: "BankID som innlogging i kundeportalen, f.eks. via Entra External ID – ingen aktiverings-e-post" },
];

const FORM = [
  "Bygges som egen app og legges inn på bedriftssidene på intrum.no – uavhengig av publiseringsløsningen",
  "Faktura først: opplasting tolkes i Document Intelligence før kunden er logget inn, lagres først etter BankID",
  "Lagrer fremdrift, så kunden kan fortsette fra lenke i e-post",
  "Hendelser per steg til analyse og Salesforce – trakten måles fra dag én",
  "Universell utforming (WCAG 2.1 AA) og norsk/engelsk",
];

// ---------- Sekvens ----------

const SEQUENCE: { who: string; what: string }[] = [
  { who: "Skjema → BFF", what: "Kunden laster opp fakturaen. BFF sender den til Document Intelligence og får avsender, mottaker, beløp og datoer" },
  { who: "BFF → MuleSoft → Brønnøysund", what: "Avsenderens org.nr slås opp: enhet, status og roller med signatur og prokura" },
  { who: "Skjema → BankID", what: "Kunden logger inn. Process API matcher navn og fødselsdato mot rollene og foreslår hvem som signerer" },
  { who: "Process API → KYC, Kontoregisteret", what: "Kundekontroll og verifisering av utbetalingskonto" },
  { who: "Skjema → BankID-signering", what: "Intrum Optimal signeres av foreslått person – eller sendes til medsignatar eller fullmektig. Webhook når alle har signert" },
  { who: "Process API → Service Bus", what: "Hendelsen «KundeSignert» publiseres – skjemaet svarer kunden med en gang" },
  { who: "Workers → Salesforce, Pink, portal, e-post", what: "Kunde og avtale i Salesforce og velkomst. Klient til Pink via kø i fase 1 – adapter i tillegg A. Idempotent med retry" },
  { who: "Skjema → Process API → Pink", what: "Første sak: kravkontroll, så «SakMottatt» til Pink – via kø i fase 1, adapter i tillegg A" },
  { who: "Pink → Process API → portal og ERP", what: "Tillegg A og fase 2: hendelser på saken blir tidslinje i portalen og status i ERP-et" },
];

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

const BACKLOG: { epic: string; stories: string[]; later?: boolean }[] = [
  { epic: "Skjema på intrum.no", stories: ["Last opp faktura og få feltene fylt ut", "Fortsett der jeg slapp", "Se tidslinjen før jeg sender"] },
  { epic: "Brønnøysund", stories: ["Hent bedrift fra org.nr", "Foreslå hvem som skal signere", "Sjekk roller på nytt ved signering"] },
  { epic: "BankID", stories: ["Logg inn med BankID", "Signer Intrum Optimal – alene eller i fellesskap", "Gi fullmakt med BankID"] },
  { epic: "Sak og kravkontroll", stories: ["Send første sak i samme flyt", "Stopp duplikater og foreldede krav", "Dokumenter inkassovarsel"] },
  { epic: "Salesforce og måling", stories: ["Kunde og avtale i Salesforce", "Oppgave til rådgiver ved avvik", "Trakt og tid til første sak"] },
  { epic: "Pink, portal og ERP", stories: ["Klient og sak i Pink via adapter", "Portal med tidslinje", "Partner-API"], later: true },
];

const SIGN_STORY = {
  story:
    "Som SMB-kunde vil jeg få foreslått riktig person til å signere avtalen med Intrum, basert på organisasjonsnummeret og registrerte signaturbestemmelser, slik at jeg slipper å finne dette selv og raskere kan sende inn min første sak.",
  criteria: [
    "Personer og signaturgrunnlag hentes fra Brønnøysundregistrene (signatur, prokura, daglig leder, styre)",
    "En egnet kandidat er forhåndsvalgt i signeringsfeltet, med kort begrunnelse («Daglig leder – kan signere alene»)",
    "Brukeren kan velge en annen person fra listen",
    "Brukeren kan oppgi en fullmektig manuelt – fullmakten godkjennes av en signaturberettiget med BankID",
    "Ved signatur i fellesskap vises hele gruppen, og alle får signeringsoppdrag",
    "Signaturtekst som ikke kan tolkes til bestemte personer, sendes til manuell kontroll",
    "Rollene sjekkes på nytt rett før signering",
  ],
};

const RACI: { what: string; avo: string; intrum: string }[] = [
  { what: "Skjema på intrum.no", avo: "Utfører", intrum: "Godkjenner" },
  { what: "Azure-løsning (BFF, workers)", avo: "Utfører", intrum: "Godkjenner, drifter" },
  { what: "MuleSoft-API-er", avo: "Utfører", intrum: "Plattform og standarder" },
  { what: "Pink-adapter (tillegg A)", avo: "Utfører sammen med", intrum: "Pink-team eier" },
  { what: "BankID- og KYC-avtaler", avo: "Rådgir", intrum: "Eier" },
  { what: "Juridisk og personvern (DPIA)", avo: "Bidrar", intrum: "Eier" },
  { what: "Pilot og opplæring", avo: "Fasiliterer", intrum: "Utfører" },
];

const RISKS = [
  { r: "Forberedelsene er ikke klare ved oppstart", m: "BankID-avtale og tilganger avklares før uke 1" },
  { r: "Pink er fortsatt manuelt i fase 1", m: "Kø med ferdig utfylte data – tillegg A fjerner steget" },
  { r: "Signaturtekst kan ikke tolkes automatisk", m: "Manuell kontroll som fallback, måle andelen" },
  { r: "Fødselsnummer fra BankID krever hjemmel", m: "Matche på navn og fødselsdato, avklare med juridisk" },
  { r: "Avhengighet til MuleSoft-teamets kapasitet", m: "Avo bygger API-ene etter Intrums standarder" },
];

const TAG_STYLE: Record<string, string> = {
  Ny: "bg-brand-100 text-brand-700",
  Utvides: "bg-sky-100 text-sky-800",
  Gjenbruk: "bg-black/5 text-ink-soft",
  "Ny / gjenbruk": "bg-brand-100 text-brand-700",
  Adapter: "bg-amber-100 text-amber-800",
};

function Section({ id, title, lead, children }: { id: string; title: string; lead?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6">
      <h2 className="text-xl font-semibold">{title}</h2>
      {lead && <p className="mt-1 text-sm text-ink-soft max-w-3xl">{lead}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function Page() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Implementering med Avo</h1>
        <p className="mt-2 text-ink-soft max-w-3xl">
          Hvordan Avo kan bistå Intrum med å gjøre skissene til drift: skjema på intrum.no, integrasjon mot Brønnøysundregistrene og BankID, og
          automatisering mot Salesforce og Pink – på stacken Intrum har i dag.
        </p>
        <nav className="mt-4 flex flex-wrap gap-2 text-sm">
          {[
            ["arkitektur", "Arkitektur"],
            ["integrasjoner", "Integrasjoner"],
            ["sekvens", "Fra skjema til Pink"],
            ["plan", "Plan"],
            ["backlog", "Backlog"],
            ["ansvar", "Ansvar og risiko"],
          ].map(([id, t]) => (
            <a key={id} href={`#${id}`} className="rounded-full bg-white ring-1 ring-black/10 px-3 py-1 hover:ring-brand-400">
              {t}
            </a>
          ))}
        </nav>
      </div>

      <GoalStats />

      <Section id="arkitektur" title="Målarkitektur på Intrums stack" lead="Nytt bygges i Azure og MuleSoft. Pink og Salesforce gjenbrukes, med en adapter mot Pink til den er flyttet til Azure.">
        <div className="space-y-3">
          {LAYERS.map((l) => (
            <div key={l.name} className="grid md:grid-cols-[150px_1fr] gap-3 items-start">
              <div className="text-xs font-semibold uppercase tracking-wide text-ink-soft md:pt-3">{l.name}</div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {l.items.map((i) => (
                  <div key={i.t} className="rounded-xl bg-white ring-1 ring-black/5 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-sm">{i.t}</div>
                      {i.tag && <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${TAG_STYLE[i.tag]}`}>{i.tag}</span>}
                    </div>
                    <div className="mt-1 text-xs text-ink-soft leading-relaxed">{i.d}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section id="integrasjoner" title="Integrasjonene">
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-white ring-1 ring-black/5 p-5">
            <div className="font-semibold">Brønnøysundregistrene</div>
            <p className="text-xs text-ink-soft mt-1">Åpne API-er, ingen avtale. System API i MuleSoft med mellomlagring.</p>
            <dl className="mt-3 space-y-3 text-sm">
              {BRREG.map((b) => (
                <div key={b.k}>
                  <dt className="font-medium">{b.k}</dt>
                  <dd className="font-mono text-[11px] text-brand-700 break-all">{b.v}</dd>
                  <dd className="text-ink-soft text-xs mt-0.5">{b.d}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-xs rounded-lg bg-amber-50 p-2.5">Rollene har navn og fødselsdato, ikke fødselsnummer. Signaturtekst som «to styremedlemmer i fellesskap» krever regler eller manuell kontroll.</p>
          </div>
          <div className="rounded-2xl bg-white ring-1 ring-black/5 p-5">
            <div className="font-semibold">BankID</div>
            <p className="text-xs text-ink-soft mt-1">Via Intrums BankID-leverandør (avklares i oppstart) som System API.</p>
            <dl className="mt-3 space-y-3 text-sm">
              {BANKID.map((b) => (
                <div key={b.k}>
                  <dt className="font-medium">{b.k}</dt>
                  <dd className="text-ink-soft text-xs mt-0.5">{b.d}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="rounded-2xl bg-white ring-1 ring-black/5 p-5">
            <div className="font-semibold">Skjemaet på intrum.no</div>
            <p className="text-xs text-ink-soft mt-1">Erstatter Pardot-skjemaet «Bli kunde». Prototypen er utgangspunktet for design og flyt.</p>
            <ul className="mt-3 space-y-2 text-xs text-ink-soft">
              {FORM.map((f) => (
                <li key={f}>• {f}</li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section id="sekvens" title="Fra skjema til Pink – teknisk sekvens" lead="Det som skjer automatisk når SMB-kunden fyller ut skjemaet. Kunden venter aldri på Pink: svaret kommer med en gang, og resten går asynkront.">
        <ol className="rounded-2xl bg-white ring-1 ring-black/5 divide-y divide-black/5">
          {SEQUENCE.map((s, i) => (
            <li key={s.what} className="grid sm:grid-cols-[40px_260px_1fr] gap-x-4 gap-y-1 px-5 py-3 text-sm items-start">
              <span className="size-7 rounded-full bg-brand-600 text-white grid place-items-center text-xs font-bold">{i + 1}</span>
              <span className="font-mono text-xs text-brand-700 sm:pt-1.5">{s.who}</span>
              <span className="sm:pt-1">{s.what}</span>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="plan" title="Plan: 8 uker med 3 personer" lead="Skjema og integrasjon for nye kunder. Avo-teamet bruker AI-assistert utvikling, med prototypen som utgangspunkt – derfor holder et lite team og kort tid.">
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
                        <span className="truncate">Sprint {i + 1} · {sp.name}</span>
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

      <Section id="backlog" title="Backlog" lead="Epos for de 8 ukene, og hva som venter i tilleggene. Signaturforslaget er beskrevet i detalj som eksempel.">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {BACKLOG.map((b) => (
            <div key={b.epic} className={b.later ? "rounded-xl border-2 border-dashed border-brand-200 p-4" : "rounded-xl bg-white ring-1 ring-black/5 p-4"}>
              <div className="flex justify-between gap-2">
                <div className="font-semibold text-sm">{b.epic}</div>
                {b.later && <span className="text-[11px] text-brand-700 font-semibold">Tillegg</span>}
              </div>
              <ul className="mt-2 space-y-1 text-xs text-ink-soft">
                {b.stories.map((s) => (
                  <li key={s}>• {s}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-2xl bg-brand-50 ring-1 ring-brand-200 p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-brand-700">Brukerhistorie · Brønnøysund og BankID</div>
          <p className="mt-2 font-medium">{SIGN_STORY.story}</p>
          <div className="mt-3 text-sm font-semibold">Akseptansekriterier</div>
          <ul className="mt-1 space-y-1 text-sm">
            {SIGN_STORY.criteria.map((c) => (
              <li key={c}>☐ {c}</li>
            ))}
          </ul>
        </div>
      </Section>

      <Section id="ansvar" title="Ansvar og risiko">
        <div className="grid lg:grid-cols-2 gap-5 items-start">
          <div className="rounded-2xl bg-white ring-1 ring-black/5 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-canvas text-left text-ink-soft">
                <tr>
                  <th className="px-5 py-2.5 font-medium">Leveranse</th>
                  <th className="py-2.5 font-medium">Avo</th>
                  <th className="px-5 py-2.5 font-medium">Intrum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {RACI.map((r) => (
                  <tr key={r.what}>
                    <td className="px-5 py-2.5">{r.what}</td>
                    <td className="py-2.5 text-brand-700 font-medium">{r.avo}</td>
                    <td className="px-5 py-2.5 text-ink-soft">{r.intrum}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rounded-2xl bg-amber-50 ring-1 ring-amber-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="text-left text-amber-900">
                <tr>
                  <th className="px-5 py-2.5 font-medium">Risiko</th>
                  <th className="px-5 py-2.5 font-medium">Tiltak</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-200">
                {RISKS.map((r) => (
                  <tr key={r.r} className="align-top">
                    <td className="px-5 py-2.5">{r.r}</td>
                    <td className="px-5 py-2.5 text-ink-soft">{r.m}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p className="mt-4 text-xs text-ink-soft">
          Gjenbrukes fra prototypen: skjemaflyt og design, datamodell, regler i kravkontrollen, kontrakten for Partner-API-et og de automatiske
          ende-til-ende-testene. Byttes ut: fiktive integrasjoner, dokumentdatabasen og den simulerte BankID-dialogen.
        </p>
      </Section>
    </div>
  );
}
