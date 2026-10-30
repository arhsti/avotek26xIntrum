/**
 * Priser fra «Avtale om innfordring og tilknyttede tjenester – Intrum Optimal», vedlegg 1 (per 2026).
 * https://www.intrum.no/media/sfsp2u2q/avtale-om-innfordring-og-tilknyttede-tjenester-intrum-optimal-2025.pdf
 * Alle priser eks. mva, KPI-justeres årlig.
 *
 * Inkassosalær står ikke i avtalen – det følger inkassoforskriften. Salærtabellen under er EKSEMPELSATSER.
 */

export const AGREEMENT_URL = "https://www.intrum.no/media/sfsp2u2q/avtale-om-innfordring-og-tilknyttede-tjenester-intrum-optimal-2025.pdf";

export type PriceRow = { item: string; price: string; note?: string };

// Det de fleste SMB-kunder møter
export const CORE_PRICES: PriceRow[] = [
  { item: "Purreservice – Intrum sender inkassovarsel", price: "0 kr", note: "Intrum beholder renter av hovedkravet" },
  { item: "Utenrettslig inkasso", price: "0 kr", note: "Intrum beholder renter av hovedkravet" },
  { item: "Utleggsbegjæring", price: "0 kr" },
  { item: "Kundeportal og dashbord", price: "0 kr" },
  { item: "Sen registrering – 60 dager eller mer etter forfall", price: "8 %", note: "av innbetalt hovedkrav" },
  { item: "Trekk av sak innen 14 dager", price: "0 kr", note: "Etter 14 dager: skrivesalær og inndrivingskostnader" },
];

export const OTHER_PRICES: PriceRow[] = [
  { item: "Langtidsoppfølging", price: "40 %", note: "av innbetalt hovedkrav og renter" },
  { item: "Tvistebehandling – forberedelse og redegjørelse", price: "3 900 kr" },
  { item: "Tvistebehandling – oppmøte i forliksrådet", price: "3 700 kr" },
  { item: "Konkurspågang", price: "30 %", note: "av innbetalt hovedkrav" },
  { item: "Tvangssalg", price: "2 600 kr", note: "per begjæring" },
  { item: "Fravikelse (husleie)", price: "2 485,50 kr", note: "per begjæring" },
  { item: "Kredittvurdering", price: "7–42 kr", note: "per søk, etter volum" },
  { item: "Integrasjoner og øvrige tjenester", price: "1 900 kr", note: "per time" },
  { item: "Juridiske tjenester (Advokatfirma Kontrakt)", price: "2 850 kr", note: "per time" },
];

export const TERMS = [
  "Avtalen varer i 3 år og fornyes deretter ett år av gangen. Oppsigelse senest 3 måneder før utløp.",
  "Salær, gebyrer og renter kreves av skyldner. Du bærer kostnadsrisikoen for utlegg og offentlige gebyrer som ikke kan kreves dekket av skyldner (rettsgebyr 1 345 kr per 2026).",
  "Betaler skyldner direkte til deg, må du melde det til Intrum.",
  "Spørsmål om saken besvares i kundeportalen innen 14 dager.",
];

// Eksempel på salær etter hovedstol (lett / tungt) – faktiske satser følger inkassoforskriften
export const EXAMPLE_INKASSOSATS = 700;

export const SALARY_BRACKETS = [
  { upTo: 500, label: "Inntil 500 kr", light: 0.25, heavy: 0.5 },
  { upTo: 2500, label: "500 – 2 500 kr", light: 0.5, heavy: 1 },
  { upTo: 10000, label: "2 500 – 10 000 kr", light: 0.75, heavy: 1.5 },
  { upTo: 50000, label: "10 000 – 50 000 kr", light: 1.5, heavy: 3 },
  { upTo: 250000, label: "50 000 – 250 000 kr", light: 3, heavy: 6 },
  { upTo: Infinity, label: "Over 250 000 kr", light: 4.5, heavy: 9 },
];

export function salaryFor(principal: number) {
  const b = SALARY_BRACKETS.find((x) => principal <= x.upTo) ?? SALARY_BRACKETS.at(-1)!;
  return { label: b.label, light: Math.round(b.light * EXAMPLE_INKASSOSATS), heavy: Math.round(b.heavy * EXAMPLE_INKASSOSATS) };
}
