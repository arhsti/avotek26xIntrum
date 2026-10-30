import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "I dag vs. ny flyt – Intrum (prototype)" };

const rows: { today: string; who: string; next: string; how: string }[] = [
  { today: "Henvendelse via nettside eller partner, registreres som lead i Salesforce", who: "Digital Sales", next: "Kunden starter selv på nett eller fra ERP", how: "Selvbetjent" },
  { today: "Kartlegging av behov, ERP, volum og ansvar", who: "Salg", next: "Ikke nødvendig for første sak – standardpakke for SMB", how: "Fjernet" },
  { today: "Standardavtalen Intrum Optimal sendes ut og signeres", who: "Salg", next: "Intrum Optimal signeres med BankID i flyten", how: "BankID" },
  { today: "Identitet og fullmakt kontrolleres", who: "Salg / kundeservice", next: "BankID + signaturrett fra Brønnøysund + KYC/AML", how: "Automatisk" },
  { today: "Kunden registreres manuelt i Pink", who: "Kundeservice", next: "Opprettes via integrasjonslaget når avtalen er signert (krever Pink-adapter)", how: "Automatisk" },
  { today: "Kunden registreres og aktiveres i kundeportalen", who: "Kundeservice", next: "Bruker opprettes og aktiveres, innlogging med BankID", how: "Automatisk" },
  { today: "Velkomst og oppfølging", who: "Kundeteam", next: "Velkomst og saksbekreftelse på e-post", how: "Automatisk" },
  { today: "Integrasjon per kunde (ofte filbasert, f.eks. Tripletex): oppsett, test, aktivering", who: "Teknisk team + kunde", next: "ERP-partner integrerer én gang mot Intrums API – kunden aktiverer selv med samtykke", how: "Standard-API" },
  { today: "Første sak sendes etter at alt over er ferdig", who: "Kunden", next: "Første sak sendes i samme flyt, med kravkontroll", how: "Minutter" },
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
          { k: "Team involvert", a: "4", b: "0 (unntak: manuell kontroll)" },
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

      <div className="mt-8 overflow-x-auto rounded-2xl bg-white ring-1 ring-black/5">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="text-left bg-brand-50">
            <tr>
              <th className="p-4 font-semibold">I dag</th>
              <th className="p-4 font-semibold">Hvem</th>
              <th className="p-4 font-semibold">Ny flyt</th>
              <th className="p-4 font-semibold">Hvordan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {rows.map((r) => (
              <tr key={r.today} className="align-top">
                <td className="p-4 text-ink-soft">{r.today}</td>
                <td className="p-4 text-ink-soft whitespace-nowrap">{r.who}</td>
                <td className="p-4">{r.next}</td>
                <td className="p-4">
                  <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-xs font-medium whitespace-nowrap">{r.how}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
