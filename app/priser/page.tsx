import type { Metadata } from "next";
import Link from "next/link";
import { AGREEMENT_URL, CORE_PRICES, EXAMPLE_INKASSOSATS, OTHER_PRICES, SALARY_BRACKETS, TERMS, type PriceRow } from "@/lib/pricing";
import { nok } from "@/lib/validation";
import { SalaryCalculator } from "./SalaryCalculator";

export const metadata: Metadata = { title: "Priser og salær – Intrum (prototype)" };

function PriceList({ rows }: { rows: PriceRow[] }) {
  return (
    <div className="rounded-2xl bg-white ring-1 ring-black/5 divide-y divide-black/5">
      {rows.map((p) => (
        <div key={p.item} className="flex justify-between gap-4 px-5 py-3.5 text-sm">
          <span>
            {p.item}
            {p.note && <span className="block text-xs text-ink-soft">{p.note}</span>}
          </span>
          <span className="font-semibold whitespace-nowrap">{p.price}</span>
        </div>
      ))}
    </div>
  );
}

export default function Priser() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 space-y-10">
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Priser og salær</h1>
        <p className="mt-3 text-ink-soft max-w-2xl">
          Intrum Optimal er standardavtalen for bedrifter. Purreservice og inkasso koster deg 0 kr – Intrum får betalt gjennom salær fra skyldner og renter av
          hovedkravet.
        </p>
      </div>

      <section>
        <h2 className="text-xl font-semibold">Det du betaler</h2>
        <div className="mt-3">
          <PriceList rows={CORE_PRICES} />
        </div>
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-semibold text-brand-700 select-none">Flere tjenester og priser</summary>
          <div className="mt-3">
            <PriceList rows={OTHER_PRICES} />
          </div>
        </details>
        <p className="mt-2 text-xs text-ink-soft">
          Intrum Optimal per 2026, eks. mva. Kilde:{" "}
          <a href={AGREEMENT_URL} className="underline" target="_blank" rel="noreferrer">
            avtale og tjenestebeskrivelse (PDF)
          </a>
          .
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Det skyldner betaler</h2>
        <p className="mt-1 text-sm text-ink-soft max-w-2xl">
          Inkassovarselet koster ingenting for skyldner. Fra betalingsoppfordringen legges inkassosalær til kravet – lavest hvis skyldner betaler raskt (lett
          salær), høyere ved videre oppfølging (tungt salær).
        </p>
        <div className="mt-4 grid md:grid-cols-[1fr_320px] gap-5 items-start">
          <div className="rounded-2xl bg-white ring-1 ring-black/5 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-canvas text-left text-ink-soft">
                <tr>
                  <th className="px-5 py-2.5 font-medium">Kravets størrelse</th>
                  <th className="py-2.5 font-medium text-right">Lett salær</th>
                  <th className="px-5 py-2.5 font-medium text-right">Tungt salær</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {SALARY_BRACKETS.map((b) => (
                  <tr key={b.label}>
                    <td className="px-5 py-2.5">{b.label}</td>
                    <td className="py-2.5 text-right tabular-nums">{nok(b.light * EXAMPLE_INKASSOSATS)}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums">{nok(b.heavy * EXAMPLE_INKASSOSATS)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <SalaryCalculator />
        </div>
        <p className="mt-2 text-xs text-ink-soft">
          Eksempelsatser regnet ut fra en inkassosats på {nok(EXAMPLE_INKASSOSATS)}. Faktiske satser følger inkassoforskriften og gjeldende inkassosats.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Verdt å vite</h2>
        <ul className="mt-3 space-y-2 text-sm text-ink-soft">
          {TERMS.map((t) => (
            <li key={t}>• {t}</li>
          ))}
        </ul>
      </section>

      <Link href="/onboarding" className="inline-block rounded-xl bg-brand-600 text-white px-6 py-3.5 font-semibold hover:bg-brand-700">
        Send en sak
      </Link>
    </div>
  );
}
