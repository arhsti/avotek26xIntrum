import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "I dag vs. ny flyt – Intrum (prototype)" };

// Dagens prosesskart (Intrum, «Behandling av SMB-kunder som ønsker integrasjon»), fase for fase
type Phase = {
  n: number;
  name: string;
  today: string[];
  rolesToday: string;
  next: string[];
  rolesNext: string;
  how: string;
};

const phases: Phase[] = [
  {
    n: 1,
    name: "Henvendelse og behov",
    today: ["Henvendelse via nettside, partner eller eksisterende kunde", "Registreres i CRM (lead/case)", "Tildeles ansvarlig (salg, partnerskap eller kundeteam)"],
    rolesToday: "Salg / Partnerskap",
    next: ["Kunden starter selv: laster opp fakturaen, eller aktiverer fra ERP-et", "Lead og kunde opprettes i Salesforce automatisk"],
    rolesNext: "Ingen – automatisk",
    how: "Selvbetjent",
  },
  {
    n: 2,
    name: "Kartlegging og vurdering",
    today: ["Kartlegge ERP, volum, tekniske krav, tidslinje og ansvar", "Beslutning: egnet for standard integrasjon?", "Nei → tilpasset løsning / prosjekt"],
    rolesToday: "Salg + Teknisk team",
    next: ["Tre spørsmål i flyten: ERP, volum, spesielle behov", "Standard → fortsetter selv", "Ikke standard → rådgiver får oppgave, men kunden kan sende første sak med en gang"],
    rolesNext: "Salg / Partnerskap – kun ved avvik",
    how: "Regel + unntak",
  },
  {
    n: 3,
    name: "Tilbud og avtale",
    today: ["Utarbeide tilbud (standard SMB-pakke, tillegg, tidsplan)", "Kunden aksepterer og signerer", "Sak opprettes og overleveres til teknisk team"],
    rolesToday: "Salg",
    next: ["Intrum Optimal signeres med BankID i flyten", "Signaturrett fra Brønnøysund, KYC/AML automatisk", "Ingen overlevering – provisjonering starter ved signering"],
    rolesNext: "Ingen – automatisk",
    how: "BankID",
  },
  {
    n: 4,
    name: "Implementering av integrasjon",
    today: ["Kick-off, tilgang og rettigheter, datakartlegging", "Oppsett av API/connector og mapping i kundens ERP", "Intern kvalitetssikring og testmiljø"],
    rolesToday: "Teknisk team + kunde",
    next: ["Gjøres én gang per ERP-partner, ikke per kunde", "Kunden aktiverer med samtykke via lenke fra ERP-et", "Kunde og portaltilgang opprettes automatisk (Pink via MuleSoft)"],
    rolesNext: "Teknisk team – per partner",
    how: "Standard-API",
  },
  {
    n: 5,
    name: "Testing og aktivering",
    today: ["Kundetest med test-saker, verifisere status", "Beslutning: test godkjent? Nei → feilsøking", "Aktivere i produksjon, opplæring, første reelle sak"],
    rolesToday: "Teknisk team + kunde",
    next: ["Første sak sendes i onboardingen – før integrasjon", "Første sak via ERP verifiserer integrasjonen automatisk", "Kravkontroll på hver sak i stedet for test-saker"],
    rolesNext: "Ingen – automatisk",
    how: "Minutter",
  },
  {
    n: 6,
    name: "Drift og oppfølging",
    today: ["Overvåke dataflyt og status", "Kundesupport ved behov", "Proaktiv oppfølging, utvikle videre bruk"],
    rolesToday: "Kundesupport",
    next: ["Oppfølgingsliste: frafall, rådgiver-kunder, ERP uten dataflyt, saker til kontroll", "Status tilbake til ERP, saksgang og meldinger i portalen"],
    rolesNext: "Kundesupport – målrettet",
    how: "Signalstyrt",
  },
];

const criteria = [
  { c: "Enkel og effektiv prosess for SMB", how: "Faktura først, BankID, én flyt", kpi: "Konvertering besøk → sak" },
  { c: "Standardisert integrasjon for vanlige ERP-systemer", how: "Ett partner-API, aktivering via lenke", kpi: "Andel nye kunder med ERP innen 30 dager" },
  { c: "Tett samarbeid og tydelig ansvarsfordeling", how: "ERP beslutter og sender, portalen følger opp; roller bare ved avvik", kpi: "Manuelle berøringer per ny kunde" },
  { c: "Kunden sender første reelle sak raskt", how: "Første sak i onboardingen, varsel samme dag", kpi: "Median tid registrering → første sak" },
  { c: "Stabil drift og god oppfølging over tid", how: "Statussynk, verifisert integrasjon, oppfølgingsliste", kpi: "Integrasjoner uten dataflyt, henvendelser om innlogging" },
];

const todayJourney = [
  { t: "«Bli kunde»-skjema", d: "Org.nr, ERP (fritekst), kontonummer, kontaktperson, type krav. Aksept av avtale og signaturrett med en avkryssing." },
  { t: "Venter på kundenummer og aktiverings-e-post", d: "Ukjent ventetid. Mangler e-posten, må kunden ringe eller sende e-post." },
  { t: "Logger inn i kundeportalen", d: "To portaler side om side: ny kundeportal og Intrum Access." },
  { t: "Registrerer saken", d: "Din referanse, skyldner, fakturabeløp, innbetalinger som negative linjer, «Omtvistet»." },
  { t: "Saken synlig neste virkedag", d: "Først da kan kunden legge ved faktura og kommentarer." },
  { t: "ERP (valgfritt)", d: "I Tripletex: marker faktura, velg Intrum og tast inn kundenummeret manuelt." },
];

const friction = [
  "Kan ikke sende en sak før man er kunde – men kravet er grunnen til at kunden kom",
  "Ingen BankID – signaturrett bekreftes med en avkryssing, ENK skriver personnummer i fritekst",
  "Avtale og priser bare i en PDF på 7 sider (3 års binding)",
  "8 % provisjon hvis saken registreres 60+ dager etter forfall – ventetid koster kunden penger",
  "Vedlegg først etter neste virkedag",
  "Mange kontaktpunkter: flere telefonnumre og e-postadresser",
];

export default function Page() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Fra første kontakt til første sak</h1>
      <p className="mt-2 text-ink-soft max-w-2xl">
        I dag går SMB-kunder gjennom seks faser med flere team før første sak. I den nye flyten blir første sak en del av onboardingen, og integrasjon
        kommer etterpå.
      </p>
      <div className="mt-8 grid sm:grid-cols-3 gap-4">
        {[
          { k: "Manuelle steg", a: "7+", b: "0" },
          { k: "Roller involvert per ny kunde", a: "4", b: "0 – kun ved avvik" },
          { k: "Tid til første sak", a: "Dager–uker", b: "Minutter" },
        ].map((s) => (
          <div key={s.k} className="rounded-2xl bg-white ring-1 ring-black/5 p-5">
            <div className="text-sm text-ink-soft">{s.k}</div>
            <div className="mt-2 flex items-baseline gap-3">
              <span className="text-lg text-ink-soft line-through">{s.a}</span>
              <span className="text-2xl font-bold text-brand-700">{s.b}</span>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-ink-soft">Anslag til diskusjon, basert på dagens prosessbeskrivelse.</p>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Kundens reise på intrum.no i dag</h2>
        <p className="text-sm text-ink-soft mt-1">Gjennomgått på intrum.no 30.10.2026. Det som skjer etter at skjemaet sendes inn, er ikke verifisert.</p>
        <div className="mt-4 grid md:grid-cols-2 gap-4">
          <ol className="rounded-2xl bg-white ring-1 ring-black/5 p-6 space-y-4 text-sm">
            {todayJourney.map((j, i) => (
              <li key={j.t} className="flex gap-3">
                <span className="size-7 shrink-0 rounded-full bg-black/5 text-ink-soft grid place-items-center text-xs font-semibold">{i + 1}</span>
                <span>
                  <span className="font-medium block">{j.t}</span>
                  <span className="text-ink-soft">{j.d}</span>
                </span>
              </li>
            ))}
          </ol>
          <div className="rounded-2xl bg-white ring-1 ring-black/5 p-6 text-sm">
            <div className="font-semibold">Friksjon kunden møter</div>
            <ul className="mt-3 space-y-2 text-ink-soft">
              {friction.map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="text-amber-600 font-bold">!</span>
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-4 text-xs text-ink-soft">
              Kilder:{" "}
              <a className="underline" href="https://www.intrum.no/bedriftstjenester/tjenester/inkasso/kjop-inkasso/">bli kunde</a>,{" "}
              <a className="underline" href="https://www.intrum.no/bedriftstjenester/tjenester/inkasso/slik-sender-du-en-sak-til-inkasso/">slik sender du en sak</a>,{" "}
              <a className="underline" href="https://www.intrum.no/bedriftstjenester/tjenester/integrasjoner/">integrasjoner</a>,{" "}
              <a className="underline" href="https://www.tripletex.no/integrasjoner/intrum/">Tripletex</a>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Prosesskartet, fase for fase</h2>
        <p className="text-sm text-ink-soft mt-1">Dagens seks faser fra Intrums prosesskart, og hva som skjer med hver av dem i ny flyt.</p>
        <div className="mt-4 space-y-3">
          {phases.map((p) => (
            <div key={p.n} className="rounded-2xl bg-white ring-1 ring-black/5 p-5 grid md:grid-cols-[200px_1fr_1fr] gap-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="size-7 rounded-full bg-brand-100 text-brand-700 grid place-items-center text-xs font-bold">{p.n}</span>
                  <span className="font-semibold">{p.name}</span>
                </div>
                <span className="mt-3 inline-block rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-xs font-medium">{p.how}</span>
              </div>
              <div className="text-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-ink-soft">I dag · {p.rolesToday}</div>
                <ul className="mt-2 space-y-1 text-ink-soft">
                  {p.today.map((t) => (
                    <li key={t}>• {t}</li>
                  ))}
                </ul>
              </div>
              <div className="text-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-brand-700">Ny flyt · {p.rolesNext}</div>
                <ul className="mt-2 space-y-1">
                  {p.next.map((t) => (
                    <li key={t}>• {t}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10 rounded-2xl bg-white ring-1 ring-black/5 overflow-hidden">
        <h2 className="font-semibold text-lg p-6 pb-3">Suksesskriteriene fra prosesskartet</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="text-left bg-canvas text-ink-soft">
              <tr>
                <th className="px-6 py-2 font-medium">Suksesskriterium</th>
                <th className="py-2 font-medium">Hvordan ny flyt oppfyller det</th>
                <th className="px-6 py-2 font-medium">Måles med</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {criteria.map((c) => (
                <tr key={c.c} className="align-top">
                  <td className="px-6 py-3 font-medium">{c.c}</td>
                  <td className="py-3">{c.how}</td>
                  <td className="px-6 py-3 text-ink-soft">{c.kpi}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <div className="mt-10 grid md:grid-cols-2 gap-5">
        <section className="rounded-2xl bg-white ring-1 ring-black/5 p-6">
          <h2 className="font-semibold text-lg">Ansvarsdeling</h2>
          <div className="mt-4 grid gap-4 text-sm">
            <div>
              <div className="font-medium">I kundens ERP</div>
              <ul className="mt-1 text-ink-soft space-y-1">
                <li>• Beslutter om en faktura skal til inkasso</li>
                <li>• Sender saken via API (ikke fil)</li>
                <li>• Viser status tilbake på fakturaen</li>
              </ul>
            </div>
            <div>
              <div className="font-medium">I Intrums kundeportal</div>
              <ul className="mt-1 text-ink-soft space-y-1">
                <li>• Følge saksgang og kravets livssyklus</li>
                <li>• Meldinger med saksbehandler</li>
                <li>• Saker sendt fra skjema og fra ERP samlet på ett sted</li>
                <li>• Innlogging med BankID – ingen egen aktivering</li>
              </ul>
            </div>
          </div>
        </section>
        <section className="rounded-2xl bg-amber-50 ring-1 ring-amber-200 p-6">
          <h2 className="font-semibold text-lg">Forutsetninger og antakelser</h2>
          <ul className="mt-4 text-sm space-y-2.5">
            <li>
              <b>Pink har ikke API i dag.</b> Prototypen går via et integrasjonslag. En Pink-adapter (eller en kø/batch mot dagens import) må på plass for
              at kunde og sak kan opprettes automatisk.
            </li>
            <li>
              <b>Intrum API</b> skal støtte verdiforslaget: send sak og få status tilbake. Partner-API-et i prototypen er et forslag til hvordan det kan se ut
              for ERP-partnere.
            </li>
            <li>
              <b>Tripletex-integrasjonen finnes, men er historisk filbasert.</b> Den kan flyttes til samme API, med samtykkebasert aktivering i stedet for
              oppsett per kunde.
            </li>
            <li>
              <b>Intrum Optimal</b> som standardavtale gjør det mulig å signere digitalt uten tilbudsrunde. Saker utenfor standard (store beløp, avvik i
              kontroll) går til manuell behandling.
            </li>
          </ul>
        </section>
      </div>

      <div className="mt-8 flex gap-3">
        <Link href="/onboarding" className="rounded-xl bg-brand-600 text-white px-5 py-3 font-semibold hover:bg-brand-700">
          Prøv den nye flyten
        </Link>
        <Link href="/erp-demo" className="rounded-xl bg-white ring-1 ring-black/10 px-5 py-3 font-semibold hover:bg-brand-50">
          Prøv via ERP
        </Link>
      </div>
    </div>
  );
}
