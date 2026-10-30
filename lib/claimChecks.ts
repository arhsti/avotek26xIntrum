import "server-only";
import { db } from "./db";
import { brregLookup, logCall } from "./integrations";
import type { ClaimCheck, ClaimDecision, DebtCase, Onboarding } from "./types";
import { isValidOrgNr } from "./validation";

/**
 * Kravkontroll: automatiske sjekker av at kravet er reelt før det registreres.
 * Brukes likt for saker fra skjema og fra ERP-partnere via API.
 */

type CheckResult = ClaimCheck;

const DAY = 86400000;
const AUTO_LIMIT = 250_000;

export async function runClaimChecks(
  creditor: Pick<Onboarding, "orgNr" | "kyc" | "company">,
  c: Pick<DebtCase, "debtor" | "invoice" | "source" | "reminderAlreadySent"> & { documentAttached?: boolean; erpVerified?: boolean },
  opts: { onboardingId?: string; excludeCaseId?: string } = {},
): Promise<ClaimDecision> {
  const checks: CheckResult[] = [];
  const add = (key: string, name: string, status: CheckResult["status"], detail: string) => checks.push({ key, name, status, detail });

  // Kreditor
  add(
    "creditor_kyc",
    "Kreditor er kundekontrollert",
    creditor.kyc?.status === "approved" ? "ok" : "fail",
    creditor.kyc?.status === "approved" ? `${creditor.company?.name} er verifisert med BankID og KYC` : "Kundekontroll mangler",
  );

  // Skyldner
  if (c.debtor.type === "company") {
    if (!c.debtor.orgNr || !isValidOrgNr(c.debtor.orgNr)) {
      add("debtor_exists", "Skyldner finnes", "warn", "Mangler gyldig organisasjonsnummer – adresse må kontrolleres manuelt");
    } else {
      const debtor = await brregLookup(c.debtor.orgNr, opts.onboardingId).catch(() => null);
      if (!debtor) add("debtor_exists", "Skyldner finnes", "warn", "Fikk ikke svar fra Brønnøysundregistrene");
      else if (debtor.status !== "Aktiv")
        add("debtor_exists", "Skyldner er aktiv", "warn", `${debtor.name} er «${debtor.status}» – kravet må meldes i boet`);
      else add("debtor_exists", "Skyldner finnes og er aktiv", "ok", `${debtor.name}, ${debtor.address.city}`);
    }
    if (c.debtor.orgNr && c.debtor.orgNr === creditor.orgNr) add("self_claim", "Krav mot egen bedrift", "fail", "Kreditor og skyldner er samme bedrift");
  } else {
    add(
      "debtor_exists",
      "Skyldner (privatperson) slås opp i Folkeregisteret",
      c.debtor.address ? "ok" : "warn",
      c.debtor.address ? "Navn og adresse matcher (simulert)" : "Mangler adresse",
    );
  }

  // Forfall og foreldelse
  const due = new Date(c.invoice.dueDate).getTime();
  const age = Math.floor((Date.now() - due) / DAY);
  if (!(age > 0)) add("due", "Kravet er forfalt", "fail", "Forfallsdato har ikke passert");
  else if (age > 3 * 365) add("due", "Kravet er ikke foreldet", "fail", `Forfalt for ${age} dager siden – foreldet etter 3 år`);
  else if (age > 2.5 * 365) add("due", "Kravet er ikke foreldet", "warn", `Forfalt for ${age} dager siden – nær foreldelse`);
  else add("due", "Kravet er forfalt og ikke foreldet", "ok", `Forfalt for ${age} dager siden`);

  // Beløp
  const amount = c.invoice.amount;
  if (!(amount > 0)) add("amount", "Gyldig beløp", "fail", "Beløpet må være større enn 0");
  else if (amount > AUTO_LIMIT) add("amount", "Beløp innenfor automatisk grense", "warn", `Over ${AUTO_LIMIT.toLocaleString("nb-NO")} kr – kontrolleres manuelt`);
  else add("amount", "Beløp innenfor automatisk grense", "ok", `${amount.toLocaleString("nb-NO")} kr`);

  // Duplikat
  const existing = await db.list<DebtCase>("cases", 2000);
  const dup = existing.find(
    (x) =>
      x.id !== opts.excludeCaseId &&
      (x.status === "registered" || x.status === "manual_review") &&
      x.creditorOrgNr === creditor.orgNr &&
      x.invoice.number === c.invoice.number,
  );
  add(
    "duplicate",
    "Ikke sendt inn tidligere",
    dup ? "fail" : "ok",
    dup ? `Faktura ${c.invoice.number} er allerede registrert (sak ${dup.caseNumber})` : `Ingen tidligere sak med fakturanr. ${c.invoice.number}`,
  );

  // Dokumentasjon av kravet
  if (c.erpVerified) add("evidence", "Faktura verifisert i regnskapssystem", "ok", "Fakturaen er hentet direkte fra kundens ERP");
  else if (c.source === "ocr" || c.documentAttached) add("evidence", "Faktura vedlagt", "ok", "Fakturadokument lest og matcher oppgitte opplysninger");
  else add("evidence", "Dokumentasjon av kravet", "warn", "Ingen faktura vedlagt – vi kan be om dokumentasjon ved innsigelse");

  // Manglende vedlegg alene stopper ikke saken; alle andre avvik går til saksbehandler
  const decision = checks.some((x) => x.status === "fail")
    ? "rejected"
    : checks.some((x) => x.status === "warn" && x.key !== "evidence")
      ? "manual_review"
      : "approved";

  await logCall("Kravkontroll", "Regelmotor: vurder krav", opts.onboardingId, { invoice: c.invoice.number, debtor: c.debtor.name }, { decision, checks });
  return { decision, checks };
}
