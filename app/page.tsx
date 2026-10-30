import Link from "next/link";

const steps = [
  { t: "Last opp fakturaen", d: "Vi finner bedriften din og den som skylder" },
  { t: "Bekreft med BankID", d: "Og signer avtalen" },
  { t: "Vi tar over i dag", d: "Inkassovarsel sendes samme dag" },
];

export default function Home() {
  return (
    <>
      <section className="bg-gradient-to-br from-brand-600 via-brand-500 to-brand-400 text-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight max-w-3xl">Har en kunde ikke betalt? Last opp fakturaen – vi tar det derfra.</h1>
          <p className="mt-5 text-lg text-brand-50 max-w-xl">Bli kunde og send saken i samme flyt. Det tar noen minutter.</p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link href="/onboarding" className="rounded-xl bg-white text-brand-700 px-6 py-3.5 font-semibold text-center hover:bg-brand-50">
              Last opp fakturaen
            </Link>
            <Link href="/priser" className="rounded-xl ring-1 ring-white/50 px-6 py-3.5 font-semibold text-center hover:bg-white/10">
              Se priser
            </Link>
          </div>
          <ol className="mt-12 grid sm:grid-cols-3 gap-3 max-w-4xl">
            {steps.map((s, i) => (
              <li key={s.t} className="flex gap-3 rounded-2xl bg-white/10 p-4 ring-1 ring-white/20">
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

      <section className="mx-auto max-w-6xl px-4 py-14 grid md:grid-cols-2 gap-5">
        <div className="rounded-2xl bg-white p-6 ring-1 ring-black/5">
          <h2 className="font-semibold text-lg">0 kr for deg når du sender i tide</h2>
          <p className="mt-2 text-sm text-ink-soft">Purreservice og inkasso koster deg 0 kr – salæret kreves av skyldner. Send innen 60 dager etter forfall, så slipper du provisjon.</p>
          <Link href="/priser" className="mt-3 inline-block text-sm font-semibold text-brand-700 hover:underline">
            Priser og salær →
          </Link>
        </div>
        <div className="rounded-2xl bg-white p-6 ring-1 ring-black/5">
          <h2 className="font-semibold text-lg">Bruker du et regnskapssystem?</h2>
          <p className="mt-2 text-sm text-ink-soft">Aktiver Intrum fra Tripletex, PowerOffice og andre, og send forfalte fakturaer med ett klikk.</p>
          <Link href="/erp-demo" className="mt-3 inline-block text-sm font-semibold text-brand-700 hover:underline">
            Se hvordan det virker →
          </Link>
        </div>
      </section>
    </>
  );
}
