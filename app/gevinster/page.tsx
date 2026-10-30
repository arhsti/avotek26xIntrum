import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Hva det gir Intrum – SMB-onboarding (prototype)" };

const adoption = [
  { t: "Starter med problemet", d: "Kunden kommer fordi en faktura ikke er betalt. Vi starter med fakturaen – ikke med et skjema om bedriften." },
  { t: "Ingen venting", d: "Kravet er hos Intrum samme dag. Ingen kundenummer, aktiverings-e-post eller «saken vises neste virkedag»." },
  { t: "Kjent innlogging", d: "BankID for identitet, signering og portal. Ingen passord å aktivere, ingen ekstra kontaktpunkter." },
  { t: "Der de allerede jobber", d: "Aktiver fra regnskapssystemet med én lenke. Status vises tilbake på fakturaen i ERP-et." },
  { t: "Åpent om tid og pris", d: "Tidslinje for hva som skjer, og tydelig at det er gratis å sende før dag 60." },
  { t: "Én plass å følge opp", d: "Én kundeportal for saker fra skjema og ERP, med meldinger til saksbehandler." },
];

const gains = [
  { t: "Flere kunder av samme trafikk", d: "Kunden sender kravet før de rekker å falle fra i ventetiden. Konverteringen fra besøk til sak blir målbar for første gang." },
  { t: "Lavere kostnad per ny kunde", d: "Registrering i Salesforce og Pink, portalaktivering og velkomst skjer automatisk. Digital Sales bruker tiden på kundene som trenger hjelp." },
  { t: "Tidligere saker", d: "Faktura først og 60-dagersgrensen gjør at kravene kommer inn tidligere. (Antakelse: ferskere krav gir høyere inndrivelse – verifiseres med Intrums egne data.)" },
  { t: "Bedre data, færre returer", d: "Bedrift, skyldner og konto hentes fra Brønnøysund, Kontoregisteret, fakturaen og ERP-et i stedet for å tastes inn. Færre saker returneres for manglende opplysninger." },
  { t: "Lavere risiko", d: "BankID, signaturrett og KYC på kunden. Kravkontroll på hver sak: duplikat, foreldelse, bestridt, dokumentert varsel." },
  { t: "Skalerer via partnere", d: "Ett partner-API for alle ERP-er. Regnskapssystemene blir en salgskanal, og kunden aktiverer selv – ikke et oppsett per kunde." },
  { t: "Mindre personavhengighet", d: "Prosessen ligger i regler og systemer, ikke hos enkeltpersoner. Unntak går til manuell vurdering med full historikk." },
  { t: "Innsikt", d: "Trakt, tid til første sak og hvor kunder faller fra – grunnlag for løpende forbedring." },
];

const kpis = [
  "Konvertering fra første besøk til innsendt sak",
  "Median tid fra registrering til første sak",
  "Andel saker sendt før 60 dager etter forfall",
  "Andel saker godkjent automatisk i kravkontrollen",
  "Manuelle berøringer per ny kunde",
  "Henvendelser om aktivering og innlogging",
  "Andel nye kunder som kobler til ERP innen 30 dager",
  "Saker returnert for manglende opplysninger",
];

const roadmap = [
  { t: "Pilot: faktura først", d: "Nye SMB-kunder fra intrum.no. Kjør side om side med dagens skjema og mål konvertering og tid." },
  { t: "Juster kravkontrollen", d: "Sammen med saksbehandlere: hvilke regler går automatisk, hva skal til manuell vurdering." },
  { t: "Tripletex og PowerOffice", d: "Erstatt manuelt kundenummer med onboarding-lenke og statussynk via API." },
  { t: "Skaler", d: "Flere ERP-partnere, flytt brukerne til én portal, Pink-adapter i MuleSoft." },
];

export default function Page() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-12">
      <div>
        <div className="text-sm font-medium text-brand-600">Kunden i fokus</div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mt-1">Hva det gir Intrum</h1>
        <p className="mt-3 text-ink-soft max-w-3xl">
          SMB-kunder kommer til Intrum fordi de har et krav som ikke blir betalt. Gevinsten for Intrum kommer bare hvis kundene faktisk bruker løsningen – derfor
          er den bygget rundt det kunden vil ha gjort, der kunden allerede er.
        </p>
      </div>

      <section>
        <h2 className="text-xl font-semibold">Hvorfor kundene tar det i bruk</h2>
        <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {adoption.map((a) => (
            <div key={a.t} className="rounded-2xl bg-white ring-1 ring-black/5 p-5">
              <div className="font-semibold">{a.t}</div>
              <p className="mt-1 text-sm text-ink-soft">{a.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Gevinster for Intrum</h2>
        <div className="mt-4 grid sm:grid-cols-2 gap-4">
          {gains.map((g, i) => (
            <div key={g.t} className="rounded-2xl bg-white ring-1 ring-black/5 p-5 flex gap-4">
              <span className="size-8 shrink-0 rounded-full bg-brand-100 text-brand-700 grid place-items-center text-sm font-bold">{i + 1}</span>
              <div>
                <div className="font-semibold">{g.t}</div>
                <p className="mt-1 text-sm text-ink-soft">{g.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-white ring-1 ring-black/5 overflow-hidden">
          <h2 className="font-semibold text-lg p-6 pb-3">KPI-er å måle</h2>
          <table className="w-full text-sm">
            <thead className="text-left bg-canvas text-ink-soft">
              <tr>
                <th className="px-6 py-2 font-medium">Måltall</th>
                <th className="px-3 py-2 font-medium">I dag</th>
                <th className="px-6 py-2 font-medium">Mål</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {kpis.map((k) => (
                <tr key={k}>
                  <td className="px-6 py-2.5">{k}</td>
                  <td className="px-3 py-2.5 text-ink-soft">[måles]</td>
                  <td className="px-6 py-2.5 text-ink-soft">[settes]</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-6 py-4 text-xs text-ink-soft">
            Flere av disse vises allerede live i <Link href="/admin" className="underline">Innsikt</Link>.
          </p>
        </div>

        <div className="rounded-2xl bg-white ring-1 ring-black/5 p-6">
          <h2 className="font-semibold text-lg">Slik får vi det i bruk</h2>
          <ol className="mt-4 space-y-4">
            {roadmap.map((r, i) => (
              <li key={r.t} className="flex gap-3">
                <span className="size-7 shrink-0 rounded-full bg-brand-600 text-white grid place-items-center text-xs font-bold">{i + 1}</span>
                <div className="text-sm">
                  <div className="font-semibold">{r.t}</div>
                  <div className="text-ink-soft">{r.d}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="rounded-2xl bg-amber-50 ring-1 ring-amber-200 p-6 text-sm">
        <h2 className="font-semibold text-lg">Forutsetninger og risiko</h2>
        <ul className="mt-3 grid md:grid-cols-2 gap-x-8 gap-y-2">
          <li>• Pink har ikke API – trenger adapter eller kø mot dagens import (se <Link href="/arkitektur" className="underline">arkitektur</Link>)</li>
          <li>• Juridisk: digital signering av Intrum Optimal med BankID, og purreservice i kundens navn</li>
          <li>• Juridisk: krav til varsel for næring vs. forbruker – ny inkassolov på vei</li>
          <li>• To portaler i dag – nye kunder bør bare møte én</li>
          <li>• Digital Sales får ny rolle: hjelpe der automatikken stopper</li>
          <li>• ERP-partnere må se egen gevinst for å bygge «Send til Intrum»</li>
        </ul>
      </section>
    </div>
  );
}
