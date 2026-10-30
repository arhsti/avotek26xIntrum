import Link from "next/link";

const steps = [
  { t: "Last opp fakturaen", d: "Vi finner din bedrift, skyldner og beløp" },
  { t: "BankID", d: "Identitet, signaturrett og kundekontroll – automatisk" },
  { t: "Signer Intrum Optimal", d: "Standardavtalen, signert med BankID" },
  { t: "Kravet er hos Intrum", d: "Inkassovarsel sendes samme dag" },
];

export default function Home() {
  return (
    <>
      <section className="bg-gradient-to-br from-brand-600 via-brand-500 to-brand-400 text-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24 grid lg:grid-cols-[1.2fr_1fr] gap-10 items-center">
          <div>
            <div className="text-sm font-medium text-brand-100">For bedrifter</div>
            <h1 className="mt-3 text-4xl sm:text-5xl font-bold tracking-tight leading-tight">Har en kunde ikke betalt? Last opp fakturaen – vi tar det derfra.</h1>
            <p className="mt-5 text-lg text-brand-50 max-w-xl">
              Vi leser fakturaen, finner bedriften din og den som skylder, og du blir kunde med BankID underveis. Kravet er hos oss samme dag – ingen venting på
              aktivering eller kundenummer.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link href="/onboarding" className="rounded-xl bg-white text-brand-700 px-6 py-3.5 font-semibold text-center hover:bg-brand-50">
                Last opp fakturaen
              </Link>
              <Link href="/erp-demo" className="rounded-xl ring-1 ring-white/50 px-6 py-3.5 font-semibold text-center hover:bg-white/10">
                Bruker du et regnskapssystem?
              </Link>
            </div>
          </div>
          <ol className="space-y-3">
            {steps.map((s, i) => (
              <li key={s.t} className="flex gap-4 rounded-2xl bg-white/10 backdrop-blur p-4 ring-1 ring-white/20">
                <span className="size-8 shrink-0 rounded-full bg-white text-brand-700 font-bold grid place-items-center">{i + 1}</span>
                <div>
                  <div className="font-semibold">{s.t}</div>
                  <div className="text-sm text-brand-50">{s.d}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 grid md:grid-cols-3 gap-5">
        {[
          { t: "Selvbetjent fra start til første sak", d: "Det som i dag krever Digital Sales, manuell registrering i Pink og portalaktivering, skjer automatisk når kunden signerer." },
          { t: "Kontroll på kunde og krav", d: "BankID, signaturrett, KYC/AML, Kontoregisteret og kravkontroll (duplikat, foreldelse, skyldner, dokumentasjon) på hver sak." },
          { t: "Skalerer via ERP-partnere", d: "Ett standard partner-API. Tripletex, PowerOffice og andre sender kunden en lenke og saker via API – ikke et integrasjonsprosjekt per kunde." },
        ].map((c) => (
          <div key={c.t} className="rounded-2xl bg-white p-6 ring-1 ring-black/5">
            <h2 className="font-semibold text-lg">{c.t}</h2>
            <p className="mt-2 text-sm text-ink-soft">{c.d}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="rounded-2xl bg-ink text-white p-6 sm:p-8 grid md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <h2 className="text-xl font-semibold">Utforsk prototypen</h2>
            <p className="text-sm text-brand-100 mt-2">Flere innganger til samme kundereise og kontrollmotor.</p>
          </div>
          <div className="md:col-span-2 grid sm:grid-cols-2 gap-3 text-sm">
            {[
              { href: "/onboarding", t: "Selvbetjent onboarding", d: "SMB-kunde direkte fra intrum.no" },
              { href: "/erp-demo", t: "Fra regnskapssystemet", d: "Simulert ERP som bruker partner-API-et" },
              { href: "/partner", t: "Partner-API", d: "Dokumentasjon for ERP-leverandører" },
              { href: "/admin", t: "Innsikt", d: "Trakt, tid til første sak og integrasjonslogg" },
              { href: "/sammenligning", t: "I dag vs. ny flyt", d: "Hvilke manuelle steg som forsvinner" },
              { href: "/portal", t: "Kundeportal", d: "Saksgang og meldinger etter innsending" },
              { href: "/arkitektur", t: "Arkitektur", d: "MuleSoft, Azure, .NET og veien til Pink" },
              { href: "/gevinster", t: "Hva det gir Intrum", d: "Gevinster, KPI-er og hva som gjør at kundene tar det i bruk" },
            ].map((l) => (
              <Link key={l.href} href={l.href} className="rounded-xl bg-white/10 p-4 hover:bg-white/15">
                <div className="font-semibold">{l.t} →</div>
                <div className="text-brand-100">{l.d}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
