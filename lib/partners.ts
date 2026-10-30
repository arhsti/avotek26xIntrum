import "server-only";
import { db, newId } from "./db";
import { runClaimChecks } from "./claimChecks";
import * as integrations from "./integrations";
import { initialEvents, phaseOf } from "./lifecycle";
import { createOnboarding, setCompany, UserError } from "./onboarding";
import type { DebtCase, Onboarding, Partner } from "./types";
import { cleanDigits, isEmail } from "./validation";

/**
 * Partner-API for ERP-systemer. Én standard integrasjon som alle ERP-er bruker,
 * i stedet for et integrasjonsprosjekt per kunde.
 *
 * Prototype: faste API-nøkler. I produksjon: OAuth2 client credentials per partner
 * og kundespesifikt samtykke (som her registreres i onboarding).
 */
export const PARTNERS: Partner[] = [
  { id: "demo-erp", name: "Demo-ERP", apiKey: "demo_erp_key" },
  { id: "tripletex", name: "Tripletex", apiKey: "demo_tripletex_key" },
  { id: "fiken", name: "Fiken", apiKey: "demo_fiken_key" },
  { id: "poweroffice", name: "PowerOffice Go", apiKey: "demo_poweroffice_key" },
];

export class PartnerError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

export function authPartner(req: Request): Partner {
  const key = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const partner = PARTNERS.find((p) => p.apiKey === key);
  if (!partner) throw new PartnerError(401, "Ugyldig eller manglende API-nøkkel");
  return partner;
}

// ---------- Onboarding-lenke ----------

export async function createOnboardingLink(partner: Partner, origin: string, body: { orgNr?: string; email?: string; returnUrl?: string }) {
  const orgNr = cleanDigits(body.orgNr ?? "");
  const o = await createOnboarding({ partner: partner.id, partnerName: partner.name, returnUrl: body.returnUrl });
  try {
    await setCompany(o.id, orgNr);
  } catch (e) {
    if (e instanceof UserError) throw new PartnerError(422, e.message);
    throw e;
  }
  if (body.email && isEmail(body.email)) {
    await db.update<Onboarding>("onboardings", o.id, { contact: { name: "", email: body.email, phone: "" } });
  }
  return { onboardingId: o.id, url: `${origin}/onboarding?id=${o.id}`, expiresIn: 86400 };
}

// ---------- Tilkoblinger ----------

async function findConnectedCustomer(partner: Partner, orgNr: string) {
  const all = await db.list<Onboarding>("onboardings", 2000);
  return all.find((o) => o.status === "completed" && o.orgNr === orgNr && o.partnerConnection?.partner === partner.id) ?? null;
}

export async function getConnection(partner: Partner, orgNrRaw: string) {
  const o = await findConnectedCustomer(partner, cleanDigits(orgNrRaw));
  return o
    ? {
        connected: true,
        customerNumber: o.customerNumber,
        companyName: o.company?.name,
        connectedAt: o.partnerConnection!.connectedAt,
        scopes: o.partnerConnection!.scopes,
        portalUrl: `/portal?id=${o.id}`,
      }
    : { connected: false };
}

// ---------- Saker ----------

export type PartnerCaseInput = {
  creditorOrgNr: string;
  externalId: string;
  debtor: DebtCase["debtor"];
  invoice: DebtCase["invoice"];
  reminderAlreadySent?: boolean;
  documentUrl?: string;
};

function toResponse(c: DebtCase & { id: string; createdAt: string }) {
  const phase = phaseOf(c);
  return {
    id: c.id,
    externalId: c.externalId,
    caseNumber: c.caseNumber ?? null,
    status: c.status,
    phase: phase.code,
    phaseLabel: phase.label,
    nextAction: c.nextAction ?? null,
    events: c.events ?? [],
    unreadMessages: (c.messages ?? []).filter((m) => m.from === "intrum").length,
    claimCheck: c.claimCheck,
    createdAt: c.createdAt,
  };
}

export async function createPartnerCase(partner: Partner, input: PartnerCaseInput) {
  const creditorOrgNr = cleanDigits(input.creditorOrgNr ?? "");
  if (!input.externalId) throw new PartnerError(400, "externalId er påkrevd");
  if (!input.debtor?.name || !input.invoice?.number || !input.invoice?.dueDate || !(Number(input.invoice?.amount) > 0)) {
    throw new PartnerError(400, "debtor.name, invoice.number, invoice.dueDate og invoice.amount er påkrevd");
  }
  const customer = await findConnectedCustomer(partner, creditorOrgNr);
  if (!customer) throw new PartnerError(403, `Kunden ${creditorOrgNr} har ikke gitt ${partner.name} tilgang. Send kunden en onboarding-lenke.`);

  // Idempotens: samme externalId gir samme sak
  const cases = await db.list<DebtCase>("cases", 2000);
  const existing = cases.find((c) => c.channel === partner.id && c.externalId === input.externalId && c.creditorOrgNr === creditorOrgNr);
  if (existing) return { created: false, case: toResponse(existing) };

  const debtor = { ...input.debtor, orgNr: input.debtor.orgNr ? cleanDigits(input.debtor.orgNr) : undefined };
  const invoice = { ...input.invoice, amount: Number(input.invoice.amount) };
  const claimCheck = await runClaimChecks(customer, { debtor, invoice, source: "erp", reminderAlreadySent: Boolean(input.reminderAlreadySent), erpVerified: true }, { onboardingId: customer.id });

  const id = newId("case");
  const base: DebtCase = {
    onboardingId: customer.id,
    creditorOrgNr,
    channel: partner.id,
    externalId: input.externalId,
    source: "erp",
    debtor,
    invoice,
    reminderAlreadySent: Boolean(input.reminderAlreadySent),
    claimCheck,
    status: "rejected",
  };

  if (claimCheck.decision === "rejected") {
    const row = await db.insert<DebtCase>("cases", id, base);
    return { created: true, case: toResponse(row) };
  }

  const pinkCase = await integrations.provision.pinkCase(customer.customerNumber!, id, customer.id);
  const manual = claimCheck.decision === "manual_review";
  if (!manual) await integrations.provision.notice(pinkCase.ref, base.reminderAlreadySent, customer.id);
  const row = await db.insert<DebtCase>("cases", id, {
    ...base,
    events: initialEvents(manual),
    status: manual ? "manual_review" : "registered",
    caseNumber: pinkCase.ref,
    submittedAt: new Date().toISOString(),
    nextAction: manual
      ? "Kontrolleres av saksbehandler innen 1 virkedag"
      : base.reminderAlreadySent
        ? "Betalingsoppfordring sendes skyldner"
        : "Inkassovarsel sendes skyldner (14 dagers frist)",
  });
  return { created: true, case: toResponse(row) };
}

export async function getPartnerCase(partner: Partner, id: string) {
  const c = await db.get<DebtCase>("cases", id);
  if (!c || c.channel !== partner.id) throw new PartnerError(404, "Fant ikke saken");
  return toResponse(c);
}

export async function listPartnerCases(partner: Partner, creditorOrgNrRaw: string) {
  const creditorOrgNr = cleanDigits(creditorOrgNrRaw);
  const cases = await db.list<DebtCase>("cases", 2000);
  return cases.filter((c) => c.channel === partner.id && c.creditorOrgNr === creditorOrgNr).map(toResponse);
}
