import type { Metadata } from "next";

export const metadata: Metadata = { title: "Arkitektur – Intrum SMB-onboarding (prototype)" };

function Box({ title, items, tone = "white" }: { title: string; items: string[]; tone?: "white" | "brand" | "ink" | "amber" }) {
  const tones = {
    white: "bg-white ring-black/10",
    brand: "bg-brand-50 ring-brand-200",
    ink: "bg-ink text-white ring-ink",
    amber: "bg-amber-50 ring-amber-200",
  };
  return (
    <div className={`rounded-xl ring-1 p-3 ${tones[tone]}`}>
      <div className="text-sm font-semibold">{title}</div>
      <ul className={`mt-1 text-xs space-y-0.5 ${tone === "ink" ? "text-brand-100" : "text-ink-soft"}`}>
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  );
}

function Layer({ label, children, cols = 4 }: { label: string; children: React.ReactNode; cols?: number }) {
  return (
    <div className="grid md:grid-cols-[140px_1fr] gap-3 items-start">
      <div className="text-xs uppercase tracking-wider text-ink-soft font-semibold md:pt-3">{label}</div>
      <div className={`grid gap-3 sm:grid-cols-2 ${cols === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}>{children}</div>
    </div>
  );
}

const Arrow = () => <div className="md:ml-[140px] pl-3 text-brand-400 text-lg leading-none">↓</div>;

const mapping = [
  ["Sider i Next.js (/onboarding, /portal)", "Kunde-webgrensesnitt i eksisterende frontend-stack, mot Experience API"],
  ["/api/onboarding/*", "Onboarding Experience API (MuleSoft) → onboarding-tjeneste i .NET på Azure"],
  ["lib/claimChecks.ts (kravkontroll)", "Kravkontroll-tjeneste i .NET med konfigurerbare regler – samme for skjema og ERP"],
  ["Innsending med fremdrift (submit)", "Azure Service Bus + .NET worker. Idempotente steg med retry – prototypen hopper allerede over fullførte steg"],
  ["lib/integrations.ts (fiktive kall)", "MuleSoft System APIs: Brreg, BankID, KYC/AML, Kontoregister, Salesforce, Pink"],
  ["/api/partner/v1 (API-nøkkel)", "Partner Experience API i MuleSoft: OAuth2 client credentials, rate limiting, versjonering"],
  ["Status til ERP via GET /cases", "I tillegg webhooks: worker publiserer hendelser fra Pink til partnerens callback"],
  ["Postgres / JSON-dokumentlager", "Azure SQL eller eksisterende datalager for onboarding-tilstand"],
];

export default function Page() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Slik passer det inn i Intrums plattform</h1>
        <p className="mt-2 text-ink-soft max-w-3xl">
          Kjerneapplikasjonene kjører on-prem og er på vei til Azure. API-er eksponeres via MuleSoft, og web for kunder og skyldnere kjører i Azure med
          .NET og workers. Prototypen er bygget for å kunne mappes rett over på dette.
        </p>
      </div>

      <section className="rounded-2xl bg-white ring-1 ring-black/5 p-5 sm:p-6 space-y-3">
        <Layer label="Kanaler">
          <Box title="Selvbetjent onboarding" items={["intrum.no / bedrift", "BankID, første sak"]} />
          <Box title="ERP-partnere" items={["Tripletex, Fiken, PowerOffice …", "Beslutter inkasso, sender sak"]} />
          <Box title="Kundeportal" items={["Saksgang og meldinger", "BankID-innlogging"]} />
          <Box title="Skyldnerportal" items={["Betaling, avdrag", "(eksisterende)"]} />
        </Layer>
        <Arrow />
        <Layer label="MuleSoft" cols={3}>
          <Box tone="brand" title="Experience APIs" items={["Onboarding API", "Partner API (send sak, status)", "Portal API"]} />
          <Box tone="brand" title="Process APIs" items={["Kundeonboarding", "Saksinngang + kravkontroll", "Saksstatus / hendelser"]} />
          <Box tone="brand" title="System APIs" items={["Pink-adapter (ny)", "Salesforce, BankID, Brreg", "KYC/AML, Kontoregister"]} />
        </Layer>
        <Arrow />
        <Layer label="Azure (.NET)" cols={3}>
          <Box title="Onboarding-tjeneste" items={["Tilstand per registrering", "Trakt og måling"]} />
          <Box title="Kravkontroll-tjeneste" items={["Regelmotor", "Godkjent / manuell / avvist"]} />
          <Box title="Workers + Service Bus" items={["Provisjonering med retry", "Statushendelser → webhooks"]} />
        </Layer>
        <Arrow />
        <Layer label="Kjernesystemer" cols={3}>
          <Box tone="ink" title="Pink" items={["On-prem → Azure", "Ingen API i dag"]} />
          <Box tone="ink" title="Salesforce" items={["Kunde, avtale, kanal"]} />
          <Box tone="ink" title="Kundeportal / IAM" items={["Brukere, tilganger"]} />
        </Layer>
      </section>

      <section className="grid md:grid-cols-2 gap-5">
        <div className="rounded-2xl bg-amber-50 ring-1 ring-amber-200 p-6 text-sm">
          <h2 className="font-semibold text-lg">Veien til Pink</h2>
          <ol className="mt-3 space-y-3">
            <li>
              <b>Fase 1 – uten Pink-API:</b> En worker skriver kunde og sak til dagens import (fil/batch) mot Pink. Kunden får kvittering og
              saksreferanse med en gang; Pink-saksnummer kommer asynkront og vises i portal og ERP når det er klart.
            </li>
            <li>
              <b>Fase 2 – System API:</b> Når Pink flyttes til Azure, bygges en Pink System API i MuleSoft. Process- og Experience-API-ene er
              uendret, så kanalene merker ikke byttet.
            </li>
          </ol>
        </div>
        <div className="rounded-2xl bg-white ring-1 ring-black/5 p-6 text-sm">
          <h2 className="font-semibold text-lg">Hvorfor dette skalerer</h2>
          <ul className="mt-3 space-y-2 text-ink-soft">
            <li>• Én Partner API for alle ERP-er – erstatter filbaserte integrasjoner per kunde</li>
            <li>• Kunden aktiverer selv med BankID og samtykke – ingen oppsett hos Intrum</li>
            <li>• Samme kravkontroll for alle kanaler, bare avvik går til manuell behandling</li>
            <li>• Asynkron provisjonering tåler at kjernesystemer er trege eller nede</li>
          </ul>
        </div>
      </section>

      <section className="rounded-2xl bg-white ring-1 ring-black/5 overflow-hidden">
        <h2 className="font-semibold text-lg p-6 pb-3">Fra prototype til målarkitektur</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="text-left bg-canvas text-ink-soft">
              <tr>
                <th className="px-6 py-2 font-medium">I prototypen</th>
                <th className="px-6 py-2 font-medium">I Intrums plattform</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {mapping.map(([a, b]) => (
                <tr key={a} className="align-top">
                  <td className="px-6 py-3 font-mono text-xs">{a}</td>
                  <td className="px-6 py-3">{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
