import "server-only";
import { db, newId, type Row } from "./db";
import * as integrations from "./integrations";
import { runClaimChecks } from "./claimChecks";
import { initialEvents } from "./lifecycle";
import type { DebtCase, FunnelEvent, Onboarding, StepKey } from "./types";
import { STEPS } from "./types";
import { cleanDigits, isEmail, isValidAccountNumber, isValidOrgNr } from "./validation";

export class UserError extends Error {}

export async function createOnboarding(channel?: Onboarding["channel"]) {
  const id = newId("onb");
  const row = await db.insert<Onboarding>("onboardings", id, {
    status: "started",
    step: "company",
    startedAt: new Date().toISOString(),
    channel,
  });
  await trackStep(id, "company");
  return row;
}

export async function getOnboarding(id: string) {
  const row = await db.get<Onboarding>("onboardings", id);
  if (!row) throw new UserError("Fant ikke registreringen");
  return row;
}

async function trackStep(onboardingId: string, step: StepKey) {
  await db.insert<FunnelEvent>("funnel_events", newId("evt"), { onboardingId, step });
}

// Flytter brukeren videre, men aldri bakover i trakten.
async function advance(o: Row<Onboarding>, to: StepKey, patch: Partial<Onboarding> = {}) {
  const next = STEPS.indexOf(to) > STEPS.indexOf(o.step) ? to : o.step;
  if (next !== o.step) await trackStep(o.id, next);
  return (await db.update<Onboarding>("onboardings", o.id, { ...patch, step: next }))!;
}

export async function goToStep(id: string, step: StepKey) {
  const o = await getOnboarding(id);
  if (!STEPS.includes(step)) throw new UserError("Ukjent steg");
  return advance(o, step);
}

// ---------- Steg 1: bedrift ----------

export async function setCompany(id: string, orgNrRaw: string) {
  const o = await getOnboarding(id);
  const orgNr = cleanDigits(orgNrRaw ?? "");
  if (!isValidOrgNr(orgNr)) throw new UserError("Organisasjonsnummeret er ikke gyldig. Sjekk at du har skrevet 9 siffer riktig.");
  const company = await integrations.brregLookup(orgNr, id);
  if (company.status !== "Aktiv") {
    await db.update<Onboarding>("onboardings", id, { orgNr, company, status: "blocked", blockedReason: `Bedriften er registrert som «${company.status}»` });
    throw new UserError(`${company.name} er registrert som «${company.status}» i Brønnøysundregistrene, og kan ikke registreres digitalt. Kontakt oss, så hjelper vi deg.`);
  }
  // Ny bedrift nullstiller tidligere identitetssjekk
  return advance(o, "identity", { orgNr, company, status: "started", blockedReason: undefined, signer: undefined, signatureRight: undefined, kyc: undefined });
}

// ---------- Steg 2: BankID, signaturrett, KYC ----------

export async function identify(id: string, personId: string) {
  const o = await getOnboarding(id);
  if (!o.company) throw new UserError("Velg bedrift først");
  const signer = await integrations.bankIdAuthenticate(personId, id);
  const [signatureRight, kyc] = await Promise.all([
    integrations.checkSignatureRight(o.company, signer, id),
    integrations.kycScreening(o.company, signer, id),
  ]);
  const contact = { name: o.contact?.name || signer.name, email: o.contact?.email ?? "", phone: o.contact?.phone ?? "" };
  return advance(o, "details", { signer, signatureRight, kyc, contact });
}

export async function suggestedAccounts(id: string) {
  const o = await getOnboarding(id);
  if (!o.orgNr) return [];
  return (await integrations.kontoregisterLookup(o.orgNr, id)).accounts;
}

// ---------- Steg 3: kontakt og utbetaling ----------

export async function setDetails(id: string, input: { name: string; email: string; phone: string; accountNumber: string }) {
  const o = await getOnboarding(id);
  if (!o.orgNr) throw new UserError("Velg bedrift først");
  const accountNumber = cleanDigits(input.accountNumber ?? "");
  if (!input.name?.trim()) throw new UserError("Fyll inn navn på kontaktperson");
  if (!isEmail(input.email ?? "")) throw new UserError("E-postadressen ser ikke riktig ut");
  if (cleanDigits(input.phone ?? "").length < 8) throw new UserError("Telefonnummeret må ha minst 8 siffer");
  if (!isValidAccountNumber(accountNumber)) throw new UserError("Kontonummeret er ikke gyldig (11 siffer, kontrollsiffer stemmer ikke)");
  const v = await integrations.kontoregisterVerify(o.orgNr, accountNumber, id);
  return advance(o, "agreement", {
    contact: { name: input.name.trim(), email: input.email.trim(), phone: input.phone.trim() },
    payout: { accountNumber, verifiedInKontoregister: v.ownerMatches },
  });
}

// ---------- Steg 4: avtale ----------

export const PACKAGE_NAME = "Intrum Optimal";

export async function signAgreement(id: string) {
  const o = await getOnboarding(id);
  if (!o.signer || !o.company) throw new UserError("Du må identifisere deg først");
  let signerPerson = o.signer;
  if (!o.signatureRight?.ok) {
    // Prototype: simulerer at en med signaturrett signerer via BankID-lenke på e-post
    const name = o.signatureRight?.signatories[0];
    const p = integrations.TEST_PERSONS.find((t) => t.name === name);
    if (!p) throw new UserError("Fant ingen med signaturrett");
    signerPerson = p;
  }
  const sig = await integrations.bankIdSign(signerPerson, `${PACKAGE_NAME} – avtale for ${o.company.name}`, id);
  // Kunder fra ERP-partner sender saker fra ERP – hopper over «første sak» i skjemaet
  return advance(o, o.channel ? "submit" : "case", {
    agreement: { package: PACKAGE_NAME, signedAt: sig.signedAt, signedBy: sig.signer, reference: sig.reference },
  });
}

// ---------- Steg 5: første sak ----------

export async function ocr(id: string, fileName: string, size: number) {
  await getOnboarding(id);
  return integrations.invoiceOcr(fileName, size, id);
}

// Faktura først: les fakturaen, finn avsender (kreditor) og fyll ut resten av flyten
export async function invoiceFirst(id: string, fileName: string, size: number) {
  await getOnboarding(id);
  const r = await integrations.invoiceOcr(fileName, size, id);
  const o = await setCompany(id, r.creditor.orgNr);
  // Kontonummeret på fakturaen verifiseres mot Kontoregisteret i neste steg
  const account = (await integrations.kontoregisterLookup(r.creditor.orgNr, id)).accounts[0];
  const prefill = { fileName, confidence: r.confidence, accountNumber: account, debtor: r.debtor, invoice: r.invoice };
  return (await db.update<Onboarding>("onboardings", o.id, { prefill }))!;
}

export async function lookupDebtor(id: string, orgNr: string) {
  await getOnboarding(id);
  if (!isValidOrgNr(orgNr)) throw new UserError("Ugyldig organisasjonsnummer for skyldner");
  const c = await integrations.brregLookup(orgNr, id);
  return { name: c.name, address: `${c.address.street}, ${c.address.postalCode} ${c.address.city}`, status: c.status };
}

type CaseInput = Pick<
  DebtCase,
  "debtor" | "invoice" | "reminderAlreadySent" | "source" | "reference" | "claimType" | "payments" | "notice" | "attachments" | "disputed" | "disputeNote"
> & { confirmed?: boolean };

export async function saveCase(id: string, input: CaseInput) {
  const o = await getOnboarding(id);
  if (!o.agreement) throw new UserError("Avtalen må signeres først");
  const { debtor, invoice } = input;
  if (!debtor?.name?.trim()) throw new UserError("Fyll inn navn på skyldner");
  if (debtor.type === "company" && debtor.orgNr && !isValidOrgNr(debtor.orgNr)) throw new UserError("Skyldners organisasjonsnummer er ugyldig");
  if (debtor.type === "person" && !debtor.address?.trim()) throw new UserError("Fyll inn adresse for privatperson");
  if (!invoice?.number?.trim()) throw new UserError("Fyll inn fakturanummer");
  const amount = Number(invoice.amount);
  if (!(amount > 0)) throw new UserError("Beløpet må være større enn 0");
  if (!invoice.dueDate || new Date(invoice.dueDate) >= new Date(new Date().toDateString())) {
    throw new UserError("Forfallsdato må ha passert før saken kan sendes til inkasso");
  }
  if (invoice.issueDate && invoice.issueDate > invoice.dueDate) throw new UserError("Fakturadato kan ikke være etter forfallsdato");
  if (!input.confirmed) throw new UserError("Bekreft at kravet er riktig og at du stopper egne purringer");
  if (input.disputed && !input.disputeNote?.trim()) throw new UserError("Beskriv kort hva skyldner har protestert på");
  const payments = (input.payments ?? [])
    .filter((p) => Number(p.amount) > 0 && p.date)
    .map((p) => ({ date: p.date, amount: Number(p.amount), type: p.type === "kreditnota" ? ("kreditnota" as const) : ("innbetaling" as const) }));
  const outstanding = Math.round((amount - payments.reduce((s, p) => s + p.amount, 0)) * 100) / 100;

  const caseId = o.draftCaseId ?? newId("case");
  const claimCheck = await runClaimChecks(o, { ...input, payments, invoice: { ...invoice, amount } }, { onboardingId: id, excludeCaseId: caseId });
  const noticeOk = claimCheck.checks.some((c) => c.key === "notice" && c.status === "ok");

  const data: DebtCase = {
    onboardingId: id,
    creditorOrgNr: o.orgNr,
    channel: "web",
    claimCheck,
    status: "draft",
    source: input.source === "ocr" ? "ocr" : "manual",
    debtor: { ...debtor, orgNr: debtor.orgNr ? cleanDigits(debtor.orgNr) : undefined, name: debtor.name.trim() },
    invoice: { ...invoice, amount },
    reminderAlreadySent: Boolean(input.reminderAlreadySent),
    reference: input.reference?.trim() || undefined,
    claimType: input.claimType ?? "faktura",
    payments,
    outstanding,
    notice: input.reminderAlreadySent ? input.notice : undefined,
    attachments: input.attachments ?? [],
    disputed: Boolean(input.disputed),
    disputeNote: input.disputed ? input.disputeNote?.trim() : undefined,
    nextAction: input.disputed
      ? "Saksbehandler vurderer innsigelsen før saken går videre"
      : noticeOk
        ? "Betalingsoppfordring sendes skyldner i dag"
        : "Inkassovarsel sendes skyldner i dag (14 dagers frist)",
  };
  const existing = o.draftCaseId ? await db.get<DebtCase>("cases", caseId) : null;
  const saved = existing ? await db.update<DebtCase>("cases", caseId, data) : await db.insert<DebtCase>("cases", caseId, data);
  if (claimCheck.decision === "rejected") {
    await db.update<Onboarding>("onboardings", id, { draftCaseId: caseId });
    const reasons = claimCheck.checks.filter((c) => c.status === "fail").map((c) => c.detail);
    throw new UserError(`Saken kan ikke sendes inn: ${reasons.join(". ")}.`);
  }
  await advance(o, "submit", { draftCaseId: caseId });
  return saved;
}

export async function getCase(caseId: string) {
  return db.get<DebtCase>("cases", caseId);
}

// ---------- Steg 6: provisjonering + innsending ----------

export type ProvisionEvent =
  | { type: "step"; key: string; label: string; system: string; status: "running" | "done" | "skipped" | "error"; ref?: string; error?: string }
  | { type: "complete"; caseNumber: string; customerNumber: string; durationMs: number }
  | { type: "error"; message: string };

export const PROVISION_LABELS = {
  salesforce: { label: "Kunde og avtale registreres i CRM", system: "Salesforce", replaces: "Digital Sales registrerer manuelt" },
  pink_client: { label: "Kunde opprettes i kjernesystem", system: "MuleSoft → Pink", replaces: "Manuell registrering i Pink" },
  portal: { label: "Tilgang til kundeportalen aktiveres", system: "Kundeportal", replaces: "Manuell portalaktivering" },
  pink_case: { label: "Første sak registreres", system: "MuleSoft → Pink", replaces: "Kunden venter på aktivering" },
  notice: { label: "Første brev til skyldner planlegges", system: "MuleSoft → Pink", replaces: "—" },
  partner_access: { label: "ERP-systemet får tilgang til å sende saker", system: "MuleSoft", replaces: "Manuelt integrasjonsprosjekt" },
  email: { label: "Velkomst og bekreftelse sendes", system: "E-post", replaces: "Manuell velkomst" },
} as const;

export async function* submit(id: string): AsyncGenerator<ProvisionEvent> {
  let o = await getOnboarding(id);
  const partnerMode = Boolean(o.channel);
  if (!o.company || !o.payout || !o.contact || !o.agreement || (!partnerMode && !o.draftCaseId)) {
    yield { type: "error", message: "Registreringen er ikke komplett" };
    return;
  }
  const debtCase = o.draftCaseId ? await db.get<DebtCase>("cases", o.draftCaseId) : null;
  if (!partnerMode && !debtCase) {
    yield { type: "error", message: "Fant ikke saken" };
    return;
  }
  const done = { ...(o.provisioning ?? {}) };
  const company = o.company, payout = o.payout, contact = o.contact, caseId = o.draftCaseId ?? "";
  const manualReview = debtCase?.claimCheck?.decision === "manual_review";

  const allSteps: { key: keyof typeof PROVISION_LABELS; run: () => Promise<{ ref: string }> }[] = [
    { key: "salesforce", run: () => integrations.provision.salesforce(company, id) },
    { key: "pink_client", run: () => integrations.provision.pinkClient(company, payout.accountNumber, id) },
    { key: "portal", run: () => integrations.provision.portal(contact.email, done.pink_client!.ref, id) },
    { key: "pink_case", run: () => integrations.provision.pinkCase(done.pink_client!.ref, caseId, id) },
    { key: "notice", run: () => integrations.provision.notice(done.pink_case!.ref, debtCase!.reminderAlreadySent, id) },
    { key: "partner_access", run: () => integrations.provision.partnerAccess(o.channel!.partnerName, done.pink_client!.ref, id) },
    { key: "email", run: () => integrations.provision.email(contact.email, id) },
  ];
  const steps = allSteps.filter((s) =>
    partnerMode ? !["pink_case", "notice"].includes(s.key) : s.key !== "partner_access" && !(manualReview && s.key === "notice"),
  );

  for (const s of steps) {
    const meta = PROVISION_LABELS[s.key];
    if (done[s.key]) {
      yield { type: "step", key: s.key, ...meta, status: "skipped", ref: done[s.key]!.ref };
      continue;
    }
    yield { type: "step", key: s.key, ...meta, status: "running" };
    try {
      const { ref } = await s.run();
      done[s.key] = { ref, at: new Date().toISOString() };
      await db.update<Onboarding>("onboardings", id, { provisioning: done });
      yield { type: "step", key: s.key, ...meta, status: "done", ref };
    } catch (e) {
      yield { type: "step", key: s.key, ...meta, status: "error", error: (e as Error).message };
      yield { type: "error", message: `${meta.system} svarte ikke. Prøv igjen – stegene som er fullført blir ikke gjentatt.` };
      return;
    }
  }

  const completedAt = new Date().toISOString();
  if (!partnerMode) {
    await db.update<DebtCase>("cases", caseId, {
      events: initialEvents(manualReview, completedAt),
      status: manualReview ? "manual_review" : "registered",
      caseNumber: done.pink_case!.ref,
      submittedAt: completedAt,
    });
  }
  o = await getOnboarding(id);
  await advance(o, "done", {
    status: "completed",
    completedAt,
    firstCaseId: partnerMode ? undefined : caseId,
    customerNumber: done.pink_client!.ref,
    partnerConnection: partnerMode ? { partner: o.channel!.partner, connectedAt: completedAt, scopes: ["cases:write", "cases:read"] } : undefined,
  });
  yield {
    type: "complete",
    caseNumber: done.pink_case?.ref ?? "",
    customerNumber: done.pink_client!.ref,
    durationMs: new Date(completedAt).getTime() - new Date(o.startedAt).getTime(),
  };
}

// ---------- Etter første sak: ERP ----------

export async function connectErp(id: string, system: string) {
  const o = await getOnboarding(id);
  if (o.status !== "completed" || !o.orgNr) throw new UserError("Fullfør registreringen først");
  const res = await integrations.erpConnect(system, o.orgNr, id);
  await db.update<Onboarding>("onboardings", id, { erp: { system, connectedAt: new Date().toISOString(), autoTransfer: true } });
  return res;
}
