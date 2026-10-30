export const STEPS = ["company", "identity", "details", "agreement", "case", "submit", "done"] as const;
export type StepKey = (typeof STEPS)[number];

export const STEP_LABELS: Record<StepKey, string> = {
  company: "Bedrift",
  identity: "Identifisering",
  details: "Kontakt og utbetaling",
  agreement: "Avtale",
  case: "Første sak",
  submit: "Oppsummering",
  done: "Sak sendt",
};

export type Role = {
  type: "Daglig leder" | "Styreleder" | "Styremedlem" | "Innehaver";
  name: string;
  birthDate: string;
  canSign: boolean;
};

export type Company = {
  orgNr: string;
  name: string;
  orgForm: string;
  status: "Aktiv" | "Under konkursbehandling" | "Slettet";
  address: { street: string; postalCode: string; city: string };
  naceCode: string;
  naceText: string;
  employees: number;
  registeredAt: string;
  vatRegistered: boolean;
  roles: Role[];
};

export type Person = {
  id: string;
  name: string;
  birthDate: string;
  nationalIdMasked: string;
};

export type Onboarding = {
  status: "started" | "completed" | "blocked";
  step: StepKey;
  startedAt: string;
  completedAt?: string;
  blockedReason?: string;
  orgNr?: string;
  company?: Company;
  signer?: Person;
  signatureRight?: { ok: boolean; role?: string; signatories: string[] };
  kyc?: { status: "approved" | "manual_review"; checks: { name: string; result: string }[] };
  contact?: { name: string; email: string; phone: string };
  payout?: { accountNumber: string; verifiedInKontoregister: boolean };
  agreement?: { package: string; signedAt: string; signedBy: string; reference: string };
  draftCaseId?: string;
  firstCaseId?: string;
  provisioning?: Partial<Record<ProvisionStep, { ref: string; at: string }>>;
  customerNumber?: string;
  erp?: { system: string; connectedAt: string; autoTransfer: boolean };
  prefill?: InvoicePrefill;
  channel?: { partner: string; partnerName: string; returnUrl?: string };
  partnerConnection?: { partner: string; connectedAt: string; scopes: string[] };
};

export type Partner = { id: string; name: string; apiKey: string };

export type ProvisionStep = "salesforce" | "pink_client" | "portal" | "pink_case" | "notice" | "partner_access" | "email";

export type ClaimCheck = { key: string; name: string; status: "ok" | "warn" | "fail" | "info"; detail: string };
export type ClaimDecision = { decision: "approved" | "manual_review" | "rejected"; checks: ClaimCheck[] };

export type DebtCase = {
  onboardingId: string;
  creditorOrgNr?: string;
  caseNumber?: string;
  status: "draft" | "registered" | "manual_review" | "rejected";
  source: "manual" | "ocr" | "erp";
  channel?: string;
  externalId?: string;
  claimCheck?: ClaimDecision;
  events?: CaseEvent[];
  messages?: CaseMessage[];
  debtor: { type: "company" | "person"; orgNr?: string; name: string; address?: string; email?: string };
  invoice: { number: string; issueDate: string; dueDate: string; amount: number; description?: string };
  reminderAlreadySent: boolean;
  reference?: string;
  claimType?: "faktura" | "husleie" | "felleskostnader";
  payments?: Payment[];
  notice?: { sentDate: string; deadline: string; fileName?: string };
  attachments?: string[];
  disputed?: boolean;
  disputeNote?: string;
  outstanding?: number;
  nextAction?: string;
  submittedAt?: string;
};

export type IntegrationLog = {
  onboardingId?: string;
  system: string;
  action: string;
  status: "ok" | "error";
  durationMs: number;
  request: unknown;
  response: unknown;
};

export type FunnelEvent = { onboardingId: string; step: StepKey };

export type WithMeta<T> = T & { id: string; createdAt: string; updatedAt: string };
export type OnboardingRow = WithMeta<Onboarding>;
export type DebtCaseRow = WithMeta<DebtCase>;
export type IntegrationLogRow = WithMeta<IntegrationLog>;

export type CaseEvent = { at: string; code: string; label: string };
export type CaseMessage = { at: string; from: "kunde" | "intrum"; text: string };

export type Payment = { date: string; amount: number; type: "innbetaling" | "kreditnota" };

/** Data lest fra fakturaen i «faktura først»-flyten, brukt til å fylle ut resten */
export type InvoicePrefill = {
  fileName: string;
  confidence: number;
  accountNumber?: string;
  debtor: DebtCase["debtor"];
  invoice: DebtCase["invoice"];
};
