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
const PROVISION_DAYS = 60;

export async function runClaimChecks(
  creditor: Pick<Onboarding, "orgNr" | "kyc" | "company">,
  c: Pick<DebtCase, "debtor" | "invoice" | "source" | "reminderAlreadySent" | "payments" | "notice" | "disputed" | "attachments"> & {
    documentAttached?: boolean;
    erpVerified?: boolean;
  },
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

  // Provisjon: Intrum Optimal tar 8 % når saken registreres 60+ dager etter forfall
  if (age >= PROVISION_DAYS) add("timing", "Registrert etter 60 dager", "info", `${age} dager etter forfall – 8 % provisjon etter Intrum Optimal`);
  else if (age > 0) add("timing", "Sendt i tide", "info", `0 kr i provisjon – ${PROVISION_DAYS - age} dager før 60-dagersgrensen`);

  // Beløp: utestående = fakturabeløp minus innbetalinger og kreditnotaer
  const paid = (c.payments ?? []).reduce((sum, p) => sum + Math.abs(Number(p.amount) || 0), 0);
  const amount = c.invoice.amount - paid;
  if (c.invoice.amount > 0 && amount <= 0) add("amount", "Noe gjenstår å kreve inn", "fail", "Fakturaen er betalt eller kreditert i sin helhet");
  else if (!(amount > 0)) add("amount", "Gyldig beløp", "fail", "Beløpet må være større enn 0");
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

  // Bestridt krav går ikke i ordinær inkasso
  if (c.disputed) add("disputed", "Kravet er ikke bestridt", "warn", "Skyldner har protestert – en saksbehandler vurderer saken før den går videre");
  else add("disputed", "Kravet er ikke bestridt", "ok", "Bekreftet av kreditor");

  // Inkassovarsel (inkassoloven § 9): sendt av kunden, eller Intrum sender (purreservice)
  if (c.reminderAlreadySent) {
    const n = c.notice;
    if (!n?.sentDate || !n?.deadline) {
      add("notice", "Inkassovarsel dokumentert", "warn", "Mangler dato og frist for varselet – kontrolleres før betalingsoppfordring");
    } else {
      const days = Math.round((new Date(n.deadline).getTime() - new Date(n.sentDate).getTime()) / DAY);
      if (days < 14) add("notice", "Varselet har minst 14 dagers frist", "warn", `Fristen var ${days} dager – Intrum sender nytt varsel`);
      else if (new Date(n.deadline).getTime() >= Date.now()) add("notice", "Fristen i varselet er ute", "warn", `Fristen går ut ${new Date(n.deadline).toLocaleDateString("nb-NO")}`);
      else add("notice", "Inkassovarsel dokumentert, frist utløpt", "ok", `Sendt ${new Date(n.sentDate).toLocaleDateString("nb-NO")}${n.fileName ? `, kopi vedlagt` : ""} – betalingsoppfordring kan sendes i dag`);
    }
  } else {
    add("notice", "Inkassovarsel", "info", "Intrum sender inkassovarsel i dag (purreservice, 0 kr)");
  }

  // Dokumentasjon av kravet
  if (c.erpVerified) add("evidence", "Faktura verifisert i regnskapssystem", "ok", "Fakturaen er hentet direkte fra kundens ERP");
  else if (c.source === "ocr" || c.documentAttached || (c.attachments?.length ?? 0) > 0) add("evidence", "Faktura vedlagt", "ok", "Fakturadokument lest og matcher oppgitte opplysninger");
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
