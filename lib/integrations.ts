import "server-only";
import { db, newId } from "./db";
import type { Company, IntegrationLog, Person, Role } from "./types";
import { cleanDigits, isValidAccountNumber, isValidOrgNr } from "./validation";

/**
 * Fiktive integrasjoner. Hvert kall får realistisk forsinkelse og logges
 * i `integration_log`, slik at admin-siden viser hva som skjer automatisk.
 */

export class IntegrationError extends Error {
  constructor(public system: string, message: string) {
    super(message);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function call<T>(
  system: string,
  action: string,
  onboardingId: string | undefined,
  request: unknown,
  latency: [number, number],
  fn: () => T | Promise<T>,
): Promise<T> {
  const started = Date.now();
  await sleep(latency[0] + Math.random() * (latency[1] - latency[0]));
  const failureRate = Number(process.env.MOCK_FAILURE_RATE ?? 0);
  let status: IntegrationLog["status"] = "ok";
  let response: unknown;
  try {
    if (failureRate > 0 && Math.random() < failureRate) {
      throw new IntegrationError(system, `${system} svarte ikke (simulert feil)`);
    }
    const result = await fn();
    response = result;
    return result;
  } catch (e) {
    status = "error";
    response = { error: (e as Error).message };
    throw e;
  } finally {
    const log: IntegrationLog = { onboardingId, system, action, status, durationMs: Date.now() - started, request, response };
    await db.insert("integration_log", newId("log"), log);
  }
}

// Logger et internt steg (uten forsinkelse), f.eks. regelmotor-resultater
export async function logCall(system: string, action: string, onboardingId: string | undefined, request: unknown, response: unknown) {
  await db.insert("integration_log", newId("log"), { onboardingId, system, action, status: "ok", durationMs: 0, request, response } satisfies IntegrationLog);
}

// ---------- Testdata ----------

export const TEST_PERSONS: Person[] = [
  { id: "kari", name: "Kari Nordmann", birthDate: "1985-03-14", nationalIdMasked: "140385 *****" },
  { id: "ola", name: "Ola Hansen", birthDate: "1979-11-02", nationalIdMasked: "021179 *****" },
  { id: "per", name: "Per Olsen", birthDate: "1968-06-21", nationalIdMasked: "210668 *****" },
];

const role = (type: Role["type"], p: Person, canSign: boolean): Role => ({ type, name: p.name, birthDate: p.birthDate, canSign });
const [kari, ola, per] = TEST_PERSONS;

const COMPANIES: Record<string, Omit<Company, "orgNr">> = {
  "923456783": {
    name: "Fjellheim Rørlegger AS",
    orgForm: "Aksjeselskap",
    status: "Aktiv",
    address: { street: "Industriveien 12", postalCode: "1337", city: "Sandvika" },
    naceCode: "43.221",
    naceText: "Rørleggerarbeid",
    employees: 14,
    registeredAt: "2014-05-02",
    vatRegistered: true,
    roles: [role("Daglig leder", kari, true), role("Styreleder", ola, true)],
  },
  "987654325": {
    name: "Bølgen Kafé AS",
    orgForm: "Aksjeselskap",
    status: "Aktiv",
    address: { street: "Bryggen 3", postalCode: "5003", city: "Bergen" },
    naceCode: "56.101",
    naceText: "Drift av restauranter og kafeer",
    employees: 7,
    registeredAt: "2019-08-19",
    vatRegistered: true,
    roles: [role("Daglig leder", per, true), role("Styremedlem", kari, false)],
  },
  "812345672": {
    name: "Nordlys Elektro Ola Hansen",
    orgForm: "Enkeltpersonforetak",
    status: "Aktiv",
    address: { street: "Storgata 88", postalCode: "9008", city: "Tromsø" },
    naceCode: "43.210",
    naceText: "Elektrisk installasjonsarbeid",
    employees: 2,
    registeredAt: "2021-01-11",
    vatRegistered: true,
    roles: [role("Innehaver", ola, true)],
  },
  "934567897": {
    name: "Gammel Handel AS",
    orgForm: "Aksjeselskap",
    status: "Under konkursbehandling",
    address: { street: "Kirkegata 1", postalCode: "0153", city: "Oslo" },
    naceCode: "47.190",
    naceText: "Butikkhandel med bredt vareutvalg",
    employees: 0,
    registeredAt: "2008-02-14",
    vatRegistered: false,
    roles: [role("Daglig leder", ola, true)],
  },
  "975312461": {
    name: "Vestkyst Eiendom AS",
    orgForm: "Aksjeselskap",
    status: "Aktiv",
    address: { street: "Strandkaien 20", postalCode: "4005", city: "Stavanger" },
    naceCode: "68.209",
    naceText: "Utleie av egen eller leid fast eiendom",
    employees: 5,
    registeredAt: "2012-10-01",
    vatRegistered: true,
    roles: [role("Daglig leder", per, true)],
  },
  "998877660": {
    name: "Tindesport AS",
    orgForm: "Aksjeselskap",
    status: "Aktiv",
    address: { street: "Fjellvegen 4", postalCode: "2609", city: "Lillehammer" },
    naceCode: "47.640",
    naceText: "Butikkhandel med sportsutstyr",
    employees: 11,
    registeredAt: "2016-03-30",
    vatRegistered: true,
    roles: [role("Daglig leder", ola, true)],
  },
};

export const DEMO_ORGNR = {
  happyPath: "923456783",
  needsCoSigner: "987654325",
  soleProprietor: "812345672",
  bankrupt: "934567897",
  debtors: ["975312461", "998877660"],
};

function hash(s: string) {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

const pick = <T,>(arr: T[], seed: number) => arr[seed % arr.length];

// Deterministisk fiktiv bedrift for et vilkårlig gyldig org.nr.
function generateCompany(orgNr: string): Company {
  const h = hash(orgNr);
  const first = ["Fjord", "Nordvik", "Solberg", "Granli", "Havbris", "Lien", "Bjørk", "Tind", "Elve", "Moa"];
  const trades: [string, string, string][] = [
    ["Bygg", "41.200", "Oppføring av bygninger"],
    ["Regnskap", "69.201", "Regnskap og bokføring"],
    ["Transport", "49.410", "Godstransport på vei"],
    ["Maling", "43.341", "Malerarbeid"],
    ["IT", "62.010", "Programmeringstjenester"],
    ["Frisør", "96.021", "Frisering og annen skjønnhetspleie"],
  ];
  const cities = [
    ["0150", "Oslo"], ["5003", "Bergen"], ["7011", "Trondheim"], ["4006", "Stavanger"], ["3015", "Drammen"], ["9008", "Tromsø"],
  ];
  const trade = pick(trades, h >> 3);
  const city = pick(cities, h >> 7);
  return {
    orgNr,
    name: `${pick(first, h)} ${trade[0]} AS`,
    orgForm: "Aksjeselskap",
    status: "Aktiv",
    address: { street: `${pick(["Storgata", "Kongens gate", "Industriveien", "Havnegata"], h >> 11)} ${(h % 90) + 1}`, postalCode: city[0], city: city[1] },
    naceCode: trade[1],
    naceText: trade[2],
    employees: (h % 40) + 1,
    registeredAt: `${2005 + (h % 19)}-0${(h % 9) + 1}-1${h % 9}`,
    vatRegistered: true,
    roles: [role("Daglig leder", kari, true), role("Styreleder", ola, true)],
  };
}

// ---------- Brønnøysundregistrene (Enhetsregisteret) ----------

export function brregLookup(orgNrRaw: string, onboardingId?: string) {
  const orgNr = cleanDigits(orgNrRaw);
  return call("Brønnøysundregistrene", "GET /enhetsregisteret/api/enheter/{orgnr}", onboardingId, { orgNr }, [250, 700], () => {
    if (!isValidOrgNr(orgNr)) throw new IntegrationError("Brønnøysundregistrene", "Ugyldig organisasjonsnummer");
    const fixed = COMPANIES[orgNr];
    return fixed ? { ...fixed, orgNr } : generateCompany(orgNr);
  });
}

// ---------- BankID (OIDC) ----------

export function bankIdAuthenticate(personId: string, onboardingId?: string) {
  return call("BankID", "OIDC /authorize + /token", onboardingId, { acr_values: "idporten-loa-high", personId }, [400, 900], () => {
    const person = TEST_PERSONS.find((p) => p.id === personId);
    if (!person) throw new IntegrationError("BankID", "Ukjent testbruker");
    return person;
  });
}

export function bankIdSign(person: Person, document: string, onboardingId?: string) {
  return call("BankID", "Sign PAdES", onboardingId, { signer: person.name, document }, [600, 1200], () => ({
    reference: `BID-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
    signedAt: new Date().toISOString(),
    signer: person.name,
  }));
}

// ---------- Signaturrett ----------

export function checkSignatureRight(company: Company, person: Person, onboardingId?: string) {
  return call("Brønnøysundregistrene", "GET /enheter/{orgnr}/roller", onboardingId, { orgNr: company.orgNr, person: person.name }, [200, 500], () => {
    const match = company.roles.find((r) => r.name === person.name && r.birthDate === person.birthDate);
    return {
      ok: Boolean(match?.canSign),
      role: match?.type,
      signatories: company.roles.filter((r) => r.canSign).map((r) => r.name),
    };
  });
}

// ---------- KYC / AML ----------

export function kycScreening(company: Company, person: Person, onboardingId?: string) {
  return call("KYC/AML-screening", "POST /screening", onboardingId, { orgNr: company.orgNr, persons: company.roles.map((r) => r.name) }, [500, 1100], () => ({
    status: "approved" as const,
    checks: [
      { name: "Sanksjonslister (EU/FN/OFAC)", result: "Ingen treff" },
      { name: "PEP-kontroll", result: "Ingen treff" },
      { name: "Reelle rettighetshavere", result: `${company.roles[0]?.name ?? person.name} (> 25 %)` },
      { name: "Bransjerisiko", result: "Lav" },
    ],
  }));
}

// ---------- Kontoregister ----------

export function kontoregisterLookup(orgNr: string, onboardingId?: string) {
  return call("Kontoregisteret", "GET /kontoer?orgnr", onboardingId, { orgNr }, [200, 500], () => {
    // Lag et gyldig MOD11-kontonummer deterministisk fra org.nr
    const h = hash(orgNr);
    for (let i = 0; i < 20; i++) {
      const base = `1503${String((h + i) % 1000000).padStart(6, "0")}`;
      for (let d = 0; d < 10; d++) {
        if (isValidAccountNumber(base + d)) return { accounts: [base + d] };
      }
    }
    return { accounts: [] as string[] };
  });
}

export function kontoregisterVerify(orgNr: string, accountNumber: string, onboardingId?: string) {
  return call("Kontoregisteret", "POST /verifiser", onboardingId, { orgNr, accountNumber }, [200, 600], () => {
    if (!isValidAccountNumber(accountNumber)) throw new IntegrationError("Kontoregisteret", "Ugyldig kontonummer");
    return { ownerMatches: true };
  });
}

// ---------- Faktura-tolkning (OCR) ----------

export function invoiceOcr(fileName: string, size: number, onboardingId?: string) {
  return call("Faktura-OCR", "POST /extract", onboardingId, { fileName, size }, [1200, 2200], () => {
    const h = hash(fileName + size + Date.now());
    const debtorOrgNr = pick(DEMO_ORGNR.debtors, h);
    const debtor = COMPANIES[debtorOrgNr];
    const due = new Date(Date.now() - (30 + (h % 40)) * 86400000);
    const issue = new Date(due.getTime() - 14 * 86400000);
    return {
      confidence: 0.94,
      debtor: { type: "company" as const, orgNr: debtorOrgNr, name: debtor.name, address: `${debtor.address.street}, ${debtor.address.postalCode} ${debtor.address.city}` },
      invoice: {
        number: String(10000 + (h % 89999)),
        issueDate: issue.toISOString().slice(0, 10),
        dueDate: due.toISOString().slice(0, 10),
        amount: Math.round((2500 + (h % 60000)) * 100) / 100,
        description: pick(["Rørleggerarbeid, bad", "Serviceavtale Q2", "Varelevering", "Konsulenttimer"], h >> 5),
      },
    };
  });
}

// ---------- Provisjonering (erstatter manuelle steg i dag) ----------

export const provision = {
  salesforce: (company: Company, onboardingId: string) =>
    call("Salesforce", "POST /sobjects/Account + Opportunity (Closed Won)", onboardingId, { name: company.name, orgNr: company.orgNr, channel: "Digital self-service" }, [500, 900], () => ({
      ref: `001${Math.random().toString(36).slice(2, 14).toUpperCase()}`,
    })),
  pinkClient: (company: Company, accountNumber: string, onboardingId: string) =>
    call("MuleSoft", "Client System API → Pink (adapter må bygges – ingen Pink-API i dag)", onboardingId, { orgNr: company.orgNr, name: company.name, payoutAccount: accountNumber }, [600, 1200], () => ({
      ref: `K-${String(hash(company.orgNr) % 900000 + 100000)}`,
    })),
  portal: (email: string, customerNumber: string, onboardingId: string) =>
    call("Kundeportal", "POST /users (aktivert, SSO via BankID)", onboardingId, { email, customerNumber }, [400, 800], () => ({
      ref: `usr_${Math.random().toString(36).slice(2, 10)}`,
    })),
  pinkCase: (customerNumber: string, caseId: string, onboardingId: string) =>
    call("MuleSoft", "Case Process API → Pink: POST /cases", onboardingId, { customerNumber, caseId }, [600, 1200], () => ({
      ref: `${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000000) + 1000000)}`,
    })),
  notice: (caseNumber: string, reminderAlreadySent: boolean, onboardingId: string) =>
    call("MuleSoft", reminderAlreadySent ? "Case Process API: POST /cases/{id}/betalingsoppfordring" : "Case Process API: POST /cases/{id}/inkassovarsel", onboardingId, { caseNumber }, [300, 700], () => ({
      ref: reminderAlreadySent ? "Betalingsoppfordring planlagt" : "Inkassovarsel planlagt (14 dagers frist)",
    })),
  partnerAccess: (partnerName: string, customerNumber: string, onboardingId: string) =>
    call("MuleSoft", "Partner Experience API: POST /partner-connections (scopes: cases:write cases:read)", onboardingId, { partnerName, customerNumber }, [300, 700], () => ({
      ref: `conn_${Math.random().toString(36).slice(2, 10)}`,
    })),
  email: (to: string, onboardingId: string) =>
    call("E-post", "POST /send (velkomst + saksbekreftelse)", onboardingId, { to, template: "smb-welcome-first-case" }, [200, 500], () => ({
      ref: `msg_${Math.random().toString(36).slice(2, 10)}`,
    })),
};

// ---------- ERP ----------

export const ERP_SYSTEMS = ["Tripletex", "Fiken", "PowerOffice Go", "Visma eAccounting", "Xledger", "24SevenOffice"];

export function erpConnect(system: string, orgNr: string, onboardingId: string) {
  return call(system, "OAuth2 consent + webhook-abonnement (forfalte fakturaer)", onboardingId, { system, orgNr }, [900, 1600], () => {
    if (!ERP_SYSTEMS.includes(system)) throw new IntegrationError(system, "Ukjent regnskapssystem");
    return { connected: true, overdueInvoicesFound: (hash(orgNr) % 6) + 1 };
  });
}
