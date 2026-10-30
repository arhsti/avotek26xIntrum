/**
 * Datakatalog for dataflytkartet: systemer, hvilke data som flyter mellom dem, og i hvilken
 * fase av Intrums prosesskart (1–6). Feltene speiler skjemaene og API-ene i prototypen.
 */

export type SystemId =
  | "kunde"
  | "erp"
  | "portal"
  | "experience"
  | "process"
  | "ocr"
  | "brreg"
  | "bankid"
  | "kyc"
  | "konto"
  | "salesforce"
  | "pink"
  | "epost";

export type SystemNode = {
  id: SystemId;
  name: string;
  kind: "kanal" | "mulesoft" | "ekstern" | "intrum";
  note: string;
  x: number;
  y: number;
};

// Posisjoner i kartet (px i et 1080 × 640-lerret)
export const SYSTEMS: SystemNode[] = [
  { id: "kunde", name: "Kunde på intrum.no", kind: "kanal", note: "Faktura først, saksskjema", x: 20, y: 60 },
  { id: "erp", name: "ERP-partner", kind: "kanal", note: "Tripletex, PowerOffice …", x: 20, y: 280 },
  { id: "portal", name: "Kundeportal", kind: "intrum", note: "Saksgang, meldinger, fullmakter", x: 20, y: 500 },
  { id: "experience", name: "MuleSoft Experience API", kind: "mulesoft", note: "Onboarding-, Partner- og Portal-API", x: 290, y: 200 },
  { id: "process", name: "MuleSoft Process API", kind: "mulesoft", note: "Onboarding, kravkontroll, status", x: 540, y: 200 },
  { id: "ocr", name: "Faktura-OCR", kind: "ekstern", note: "Leser fakturaen", x: 840, y: 10 },
  { id: "brreg", name: "Brønnøysundregistrene", kind: "ekstern", note: "Enhet, roller, signatur", x: 840, y: 80 },
  { id: "bankid", name: "BankID", kind: "ekstern", note: "Innlogging og signering", x: 840, y: 150 },
  { id: "kyc", name: "KYC/AML-screening", kind: "ekstern", note: "Sanksjoner, PEP, eiere", x: 840, y: 220 },
  { id: "konto", name: "Kontoregisteret", kind: "ekstern", note: "Eier av kontonummer", x: 840, y: 290 },
  { id: "salesforce", name: "Salesforce", kind: "intrum", note: "Kunde, avtale, oppgaver", x: 840, y: 360 },
  { id: "pink", name: "Pink", kind: "intrum", note: "Kjernesystem – ingen API i dag", x: 840, y: 450 },
  { id: "epost", name: "E-post", kind: "intrum", note: "Bekreftelser", x: 840, y: 560 },
];

export type Field = { name: string; example: string; source: string };

export type Flow = {
  id: string;
  from: SystemId;
  to: SystemId;
  title: string;
  phase: number;
  journey: JourneyId;
  fields: Field[];
};

export type JourneyId = "onboarding" | "sak" | "erp" | "status";

export const JOURNEYS: { id: JourneyId; name: string; description: string }[] = [
  { id: "onboarding", name: "Bli kunde", description: "Fra faktura til signert avtale og opprettet kunde (fase 1–4)" },
  { id: "sak", name: "Første sak", description: "Saksskjema, kravkontroll og registrering i Pink (fase 5)" },
  { id: "erp", name: "Sak fra ERP", description: "Aktivering fra ERP og saker via Partner-API (fase 4–5)" },
  { id: "status", name: "Status og oppfølging", description: "Hendelser fra Pink tilbake til kunden og ERP (fase 6)" },
];

export const PHASES = ["", "Henvendelse og behov", "Kartlegging og vurdering", "Tilbud og avtale", "Implementering", "Testing og aktivering", "Drift og oppfølging"];

const f = (name: string, example: string, source: string): Field => ({ name, example, source });

export const FLOWS: Flow[] = [
  // --- Bli kunde
  {
    id: "faktura",
    from: "kunde",
    to: "experience",
    title: "Faktura lastes opp",
    phase: 1,
    journey: "onboarding",
    fields: [f("Fakturafil", "faktura-32472.pdf", "Steg 1: Start med fakturaen")],
  },
  {
    id: "ocr",
    from: "process",
    to: "ocr",
    title: "Tolk fakturaen",
    phase: 1,
    journey: "onboarding",
    fields: [
      f("Avsender org.nr (blir kreditor)", "923 456 783", "OCR"),
      f("Mottaker (blir skyldner)", "Vestkyst Eiendom AS", "OCR"),
      f("Fakturanr., datoer, beløp", "32472 · forfall 28.09 · 18 502 kr", "OCR"),
      f("Kontonummer og KID", "1503.48.00348", "OCR"),
    ],
  },
  {
    id: "brreg-kreditor",
    from: "process",
    to: "brreg",
    title: "Slå opp bedriften",
    phase: 1,
    journey: "onboarding",
    fields: [
      f("Org.nr", "923 456 783", "Fra faktura eller skjema"),
      f("← Navn, adresse, org.form, bransje", "Fjellheim Rørlegger AS, AS", "Enhetsregisteret"),
      f("← Status (aktiv / konkurs)", "Aktiv", "Enhetsregisteret"),
      f("← Roller, signatur og prokura", "Daglig leder alene", "Rolleregisteret"),
    ],
  },
  {
    id: "bankid-login",
    from: "experience",
    to: "bankid",
    title: "Innlogging med BankID",
    phase: 1,
    journey: "onboarding",
    fields: [f("← Navn og fødselsdato", "Kari Nordmann, 14.03.1985", "BankID"), f("← Fødselsnummer (maskert)", "140385 *****", "BankID")],
  },
  {
    id: "kyc",
    from: "process",
    to: "kyc",
    title: "Kundekontroll",
    phase: 2,
    journey: "onboarding",
    fields: [
      f("Bedrift og personer i roller", "923 456 783 · Kari Nordmann, Ola Hansen", "Brreg"),
      f("← Sanksjoner, PEP, reelle rettighetshavere", "Ingen treff", "KYC-leverandør"),
    ],
  },
  {
    id: "konto",
    from: "process",
    to: "konto",
    title: "Verifiser utbetalingskonto",
    phase: 2,
    journey: "onboarding",
    fields: [f("Org.nr og kontonummer", "923 456 783 · 1503.48.00348", "Steg 3: Kontakt og utbetaling"), f("← Eier stemmer", "Ja", "Kontoregisteret")],
  },
  {
    id: "bankid-sign",
    from: "experience",
    to: "bankid",
    title: "Signering av Intrum Optimal",
    phase: 3,
    journey: "onboarding",
    fields: [
      f("Avtaledokument", "Intrum Optimal – Fjellheim Rørlegger AS", "Steg 4: Avtale"),
      f("Signatarer etter Brønnøysund", "Kari Nordmann (+ medsignatar ved fellesskap)", "Brreg"),
      f("← Signatur (PAdES) og referanse", "BID-7F3K2Q", "BankID"),
    ],
  },
  {
    id: "sf",
    from: "process",
    to: "salesforce",
    title: "Kunde og avtale i CRM",
    phase: 3,
    journey: "onboarding",
    fields: [
      f("Account: navn, org.nr, adresse", "Fjellheim Rørlegger AS", "Brreg"),
      f("Kontaktperson", "Kari Nordmann · kari@fjellheim.no · 900 00 000", "Steg 3"),
      f("Kvalifisering: ERP, volum, behov, segment", "Tripletex · 6–20/mnd · standard", "Steg 3"),
      f("Opportunity: Intrum Optimal, signert", "Closed Won 30.10.2026", "Steg 4"),
      f("Kanal", "Digital selvbetjening / Demo-ERP", "System"),
      f("Task til rådgiver (ved avvik)", "Over 100 saker i måneden", "Kvalifisering"),
    ],
  },
  {
    id: "pink-klient",
    from: "process",
    to: "pink",
    title: "Opprett klient i Pink",
    phase: 4,
    journey: "onboarding",
    fields: [
      f("Org.nr, navn, adresse", "923 456 783 · Fjellheim Rørlegger AS", "Brreg"),
      f("Utbetalingskonto (verifisert)", "1503.48.00348", "Steg 3 + Kontoregisteret"),
      f("Avtale og prismodell", "Intrum Optimal", "Steg 4"),
      f("Kontaktperson", "Kari Nordmann", "Steg 3"),
      f("Personer som kan sende saker", "Signatur, prokura, fullmakt", "Brreg + avtale"),
      f("← Kundenummer", "K-480034", "Pink"),
    ],
  },
  {
    id: "portal-bruker",
    from: "process",
    to: "portal",
    title: "Aktiver kundeportalen",
    phase: 4,
    journey: "onboarding",
    fields: [
      f("Bruker: navn, e-post, BankID-identitet", "Kari Nordmann · kari@fjellheim.no", "Steg 2–3"),
      f("Kundenummer", "K-480034", "Pink"),
      f("Tilganger", "Signatur alene (Brønnøysund)", "Brreg"),
    ],
  },
  {
    id: "epost",
    from: "process",
    to: "epost",
    title: "Velkomst og bekreftelse",
    phase: 4,
    journey: "onboarding",
    fields: [f("Mottaker", "kari@fjellheim.no", "Steg 3"), f("Kundenummer og saksnummer", "K-480034 · 2026-6212051", "Pink")],
  },
  // --- Første sak
  {
    id: "saksskjema",
    from: "kunde",
    to: "experience",
    title: "Saksskjema sendes inn",
    phase: 5,
    journey: "sak",
    fields: [
      f("Type krav og din referanse", "Faktura · Prosjekt 114", "Steg 5: Kravet"),
      f("Skyldner: navn, org.nr/fødselsdato, adresse, kontakt", "Vestkyst Eiendom AS · 975 312 461", "Steg 5"),
      f("Faktura: nr., fakturadato, forfall, beløp", "20431 · 16.09.2026 · 18 750 kr", "Steg 5 / OCR"),
      f("Innbetalinger og kreditnotaer", "− 5 000 kr 10.10.2026", "Steg 5"),
      f("Inkassovarsel: dato, frist, kopi", "30.09 · 15.10 · inkassovarsel.pdf", "Steg 5"),
      f("Vedlegg", "faktura-20431.pdf", "Steg 5"),
      f("Omtvistet + beskrivelse", "Nei", "Steg 5"),
      f("Bekreftelse: riktig krav, egne purringer stoppes", "Ja", "Steg 5"),
    ],
  },
  {
    id: "brreg-skyldner",
    from: "process",
    to: "brreg",
    title: "Slå opp skyldner",
    phase: 5,
    journey: "sak",
    fields: [f("Skyldners org.nr", "975 312 461", "Steg 5"), f("← Navn, adresse, status", "Vestkyst Eiendom AS · Aktiv", "Enhetsregisteret")],
  },
  {
    id: "pink-sak",
    from: "process",
    to: "pink",
    title: "Registrer sak i Pink",
    phase: 5,
    journey: "sak",
    fields: [
      f("Kundenummer (kreditor) og innsender", "K-480034 · Kari Nordmann (signatur)", "Pink + Brreg"),
      f("Skyldner", "Vestkyst Eiendom AS · 975 312 461 · Strandkaien 20", "Steg 5 + Brreg"),
      f("Krav: fakturanr., datoer, hovedstol", "20431 · 18 750 kr", "Steg 5"),
      f("Innbetalinger → utestående", "13 750 kr", "Beregnet"),
      f("Inkassovarsel dokumentert → første tiltak", "Betalingsoppfordring i dag", "Kravkontroll"),
      f("Vedlegg og referanse", "faktura-20431.pdf · Prosjekt 114", "Steg 5"),
      f("Kravkontroll-resultat", "Godkjent automatisk (9 kontroller)", "Process API"),
      f("Kanal", "Skjema / Demo-ERP", "System"),
      f("← Saksnummer", "2026-6212051", "Pink"),
    ],
  },
  // --- ERP
  {
    id: "erp-lenke",
    from: "erp",
    to: "experience",
    title: "Be om onboarding-lenke",
    phase: 4,
    journey: "erp",
    fields: [f("Org.nr", "812 345 672", "ERP-et"), f("E-post", "ola@nordlys.no", "ERP-et"), f("Returadresse", "https://erp …/intrum", "ERP-et"), f("← Lenke til onboarding", "/onboarding?id=…", "Experience API")],
  },
  {
    id: "erp-sak",
    from: "erp",
    to: "experience",
    title: "Send sak via Partner-API",
    phase: 5,
    journey: "erp",
    fields: [
      f("externalId (idempotens)", "INV-10231", "ERP-et"),
      f("Kreditor org.nr", "812 345 672", "ERP-et"),
      f("Skyldner fra kunderegisteret", "Vestkyst Eiendom AS · 975 312 461", "ERP-et"),
      f("Faktura fra reskontro", "10231 · 18 750 kr · forfall", "ERP-et"),
      f("Purrehistorikk (inkassovarsel)", "Sendt 02.10 · frist 16.10", "ERP-et"),
      f("Innbetalinger", "—", "ERP-et"),
    ],
  },
  {
    id: "erp-pink",
    from: "process",
    to: "pink",
    title: "Registrer ERP-sak i Pink",
    phase: 5,
    journey: "erp",
    fields: [f("Samme sak som fra skjema", "Se «Registrer sak i Pink»", "Partner-API"), f("Innsender", "Demo-ERP (samtykke signert av Ola Hansen)", "Avtale")],
  },
  // --- Status
  {
    id: "pink-hendelser",
    from: "pink",
    to: "process",
    title: "Hendelser på saken",
    phase: 6,
    journey: "status",
    fields: [
      f("Saksnummer og fase", "2026-6212051 · Betalingsoppfordring sendt", "Pink"),
      f("Innbetalt beløp", "18 750 kr", "Pink"),
      f("Utbetaling til kreditor", "Utbetalt 12.12", "Pink"),
    ],
  },
  {
    id: "status-portal",
    from: "process",
    to: "portal",
    title: "Tidslinje og meldinger i portalen",
    phase: 6,
    journey: "status",
    fields: [f("Tidslinje per sak", "Varsel → oppfordring → betalt", "Pink"), f("Meldinger med saksbehandler", "«Skyldner sier de har betalt»", "Portal")],
  },
  {
    id: "status-erp",
    from: "experience",
    to: "erp",
    title: "Status tilbake til ERP",
    phase: 6,
    journey: "status",
    fields: [f("externalId og saksnummer", "INV-10231 · 2026-5907659", "Pink"), f("Fase og hendelser", "Sak registrert hos Intrum", "Pink")],
  },
  {
    id: "portal-fullmakt",
    from: "portal",
    to: "process",
    title: "Fullmakt til regnskapsfører",
    phase: 6,
    journey: "status",
    fields: [f("Navn og e-post", "Lise Berg · lise@regnskap.no", "Portal"), f("Signert av", "Kari Nordmann (signatur)", "BankID")],
  },
];

// Kanaler snakker med Experience API, som videresender til Process API
export const BACKBONE: { from: SystemId; to: SystemId }[] = [{ from: "experience", to: "process" }];

/** Hvilket system et logginnslag i prototypen tilhører (for «ekte data» i kartet) */
export function systemForLog(system: string, action: string): SystemId | null {
  if (system === "Brønnøysundregistrene") return "brreg";
  if (system === "BankID") return "bankid";
  if (system.startsWith("KYC")) return "kyc";
  if (system === "Kontoregisteret") return "konto";
  if (system === "Faktura-OCR") return "ocr";
  if (system === "Salesforce") return "salesforce";
  if (system === "Kundeportal") return "portal";
  if (system === "E-post") return "epost";
  if (system === "Kravkontroll" || system === "Kvalifisering") return "process";
  if (system === "Partner-API") return "experience";
  if (system === "MuleSoft") return action.includes("Pink") || action.includes("/cases") ? "pink" : "experience";
  return "erp";
}

/**
 * Hva skjer hos Intrum etter at SMB-kunden har fylt ut skjemaet – fase for fase etter
 * dagens prosesskart («Behandling av SMB-kunder som ønsker integrasjon»), i dag vs. ny flyt.
 */
export type ProcessStep = {
  phase: number;
  today: { who: string; what: string[]; systems: string; pain: string };
  next: { who: string; what: string[]; flows: string[] };
};

export const PROCESS_STEPS: ProcessStep[] = [
  {
    phase: 1,
    today: {
      who: "Digital Sales",
      what: ["Skjemaet lander som lead", "Digital Sales fullfører registreringen i Salesforce og oppretter en sak", "Ansvarlig tildeles (salg, partnerskap eller kundeteam)"],
      systems: "Pardot-skjema → Salesforce (manuelt)",
      pain: "Manuelt, venter på at noen tar saken",
    },
    next: {
      who: "Automatisk",
      what: ["Fakturaen tolkes og bedriften slås opp i Brønnøysund", "Kunde og lead opprettes i Salesforce med kanal og kontakt"],
      flows: ["faktura", "ocr", "brreg-kreditor", "sf"],
    },
  },
  {
    phase: 2,
    today: {
      who: "Salg + teknisk team",
      what: ["Kartlegger ERP, volum, tekniske krav og ansvar hos kunden", "Vurderer: egnet for standard integrasjon?", "Nei → tilpasset løsning eller prosjekt"],
      systems: "Møter, e-post, Salesforce",
      pain: "Alle kunder kartlegges, også de som passer standard",
    },
    next: {
      who: "Automatisk – rådgiver kun ved avvik",
      what: ["BankID, signaturrett og KYC/AML kontrolleres", "Tre spørsmål i skjemaet avgjør standard eller rådgiver", "Avvik → oppgave til rådgiver i Salesforce"],
      flows: ["bankid-login", "kyc", "konto"],
    },
  },
  {
    phase: 3,
    today: {
      who: "Salg",
      what: ["Utarbeider tilbud (SMB-pakke, tillegg, tidsplan)", "Kunden signerer avtalen (PDF i to eksemplarer)", "Sak opprettes og overleveres til teknisk team"],
      systems: "Salesforce, PDF",
      pain: "Papir/PDF, overlevering mellom team",
    },
    next: {
      who: "Automatisk",
      what: ["Intrum Optimal signeres med BankID av dem som har signatur i Brønnøysund", "Avtalen registreres i Salesforce (Closed Won)"],
      flows: ["bankid-sign", "sf"],
    },
  },
  {
    phase: 4,
    today: {
      who: "Kundesupport + teknisk team",
      what: ["Kunden registreres manuelt i Pink", "Kunden registreres og aktiveres i kundeportalen", "Kick-off, tilganger og oppsett av integrasjon per kunde"],
      systems: "Pink og kundeportal (manuelt), ERP-oppsett",
      pain: "Personavhengig, feilkilder, vanskelig portalaktivering",
    },
    next: {
      who: "Automatisk via MuleSoft",
      what: ["Klient opprettes i Pink via adapter (kundenummer tilbake)", "Portalbruker aktiveres med BankID-innlogging", "Velkomst på e-post – integrasjon gjenbrukes per ERP-partner"],
      flows: ["pink-klient", "portal-bruker", "epost", "erp-lenke"],
    },
  },
  {
    phase: 5,
    today: {
      who: "Teknisk team + kunde",
      what: ["Kundetest med test-saker", "Test godkjent? Nei → feilsøking", "Aktivering, opplæring – så første reelle sak"],
      systems: "ERP-integrasjon (ofte fil), Pink",
      pain: "Lang ledetid før første sak",
    },
    next: {
      who: "Automatisk – saksbehandler ved avvik",
      what: ["Første sak sendes i samme flyt", "Kravkontroll og skyldner slås opp", "Sak registreres i Pink, varsel samme dag", "Første sak fra ERP verifiserer integrasjonen"],
      flows: ["saksskjema", "brreg-skyldner", "pink-sak", "erp-sak", "erp-pink"],
    },
  },
  {
    phase: 6,
    today: {
      who: "Kundesupport",
      what: ["Overvåker dataflyt og status", "Support og proaktiv oppfølging"],
      systems: "Pink, kundeportal",
      pain: "Lik oppfølging av alle kunder",
    },
    next: {
      who: "Automatisk – kundesupport på signaler",
      what: ["Hendelser fra Pink blir tidslinje i portalen og status i ERP", "Oppfølgingsliste: frafall, ERP uten dataflyt, saker til kontroll"],
      flows: ["pink-hendelser", "status-portal", "status-erp", "portal-fullmakt"],
    },
  },
];
