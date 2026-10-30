import type { Metadata } from "next";

export const metadata: Metadata = { title: "Partner-API – Intrum (prototype)" };

function Code({ children }: { children: string }) {
  return <pre className="mt-3 rounded-xl bg-ink text-brand-50 p-4 text-xs overflow-x-auto leading-relaxed">{children}</pre>;
}

function Endpoint({ method, path, children }: { method: string; path: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white ring-1 ring-black/5 p-6">
      <div className="flex flex-wrap items-center gap-2 font-mono text-sm">
        <span className={method === "GET" ? "rounded bg-emerald-100 text-emerald-800 px-2 py-0.5" : "rounded bg-brand-100 text-brand-700 px-2 py-0.5"}>{method}</span>
        <span className="break-all">{path}</span>
      </div>
      <div className="mt-3 text-sm text-ink-soft space-y-2">{children}</div>
    </section>
  );
}

export default function PartnerDocs() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 space-y-6">
      <div>
        <div className="text-sm font-medium text-brand-600">For ERP-leverandører</div>
        <h1 className="text-3xl font-bold tracking-tight mt-1">Intrum partner-API</h1>
        <p className="mt-3 text-ink-soft">
          Én standard integrasjon som alle regnskapssystemer kan bruke. Kunden aktiverer selv med BankID via en lenke fra ERP-et, og deretter sendes
          saker via API. Ingen integrasjonsprosjekt per kunde.
        </p>
      </div>

      <section className="rounded-2xl bg-brand-50 p-6 text-sm">
        <h2 className="font-semibold text-base">Flyt</h2>
        <ol className="mt-3 space-y-2 list-decimal list-inside">
          <li>ERP sjekker om kunden er koblet til: <code>GET /connections?orgNr=</code></li>
          <li>Hvis ikke: ERP ber om en onboarding-lenke og sender kunden dit. Kunden logger inn med BankID, signerer og gir ERP-et tilgang.</li>
          <li>Kunden sendes tilbake til <code>returnUrl</code>.</li>
          <li>ERP sender forfalte fakturaer: <code>POST /cases</code>. Hver sak går gjennom kravkontroll og får status.</li>
        </ol>
        <p className="mt-4 text-ink-soft">
          Autentisering: <code>Authorization: Bearer &lt;api-nøkkel&gt;</code>. Testnøkler i prototypen: <code>demo_erp_key</code>, <code>demo_tripletex_key</code>,{" "}
          <code>demo_fiken_key</code>, <code>demo_poweroffice_key</code>. I produksjon: OAuth2 client credentials per partner.
        </p>
      </section>

      <Endpoint method="GET" path="/api/partner/v1/connections?orgNr=923456783">
        <p>Om kunden har gitt denne partneren tilgang.</p>
        <Code>{`{ "connected": true, "customerNumber": "K-482913", "companyName": "Fjellheim Rørlegger AS",
  "connectedAt": "2026-10-30T10:12:44.000Z", "scopes": ["cases:write", "cases:read"] }`}</Code>
      </Endpoint>

      <Endpoint method="POST" path="/api/partner/v1/onboarding-links">
        <p>Lager en onboarding-lenke der bedriften er forhåndsutfylt. Bedrifter som er under konkurs eller slettet avvises med 422.</p>
        <Code>{`curl -X POST $HOST/api/partner/v1/onboarding-links \\
  -H "Authorization: Bearer demo_tripletex_key" -H "Content-Type: application/json" \\
  -d '{ "orgNr": "923456783", "email": "kari@fjellheim.no", "returnUrl": "https://erp.example/intrum/ferdig" }'

→ 201 { "onboardingId": "onb_…", "url": "https://…/onboarding?id=onb_…", "expiresIn": 86400 }`}</Code>
      </Endpoint>

      <Endpoint method="POST" path="/api/partner/v1/cases">
        <p>
          Sender et krav til inkasso. <code>externalId</code> gjør kallet idempotent: samme ID gir samme sak (200). Ny sak gir 201, avvist sak 422 med
          begrunnelse i <code>claimCheck</code>.
        </p>
        <Code>{`curl -X POST $HOST/api/partner/v1/cases \\
  -H "Authorization: Bearer demo_tripletex_key" -H "Content-Type: application/json" \\
  -d '{
    "creditorOrgNr": "923456783",
    "externalId": "INV-10231",
    "debtor": { "type": "company", "orgNr": "975312461", "name": "Vestkyst Eiendom AS" },
    "invoice": { "number": "10231", "issueDate": "2026-09-06", "dueDate": "2026-09-20", "amount": 18750 },
    "reminderAlreadySent": false
  }'

→ 201 {
  "id": "case_…", "externalId": "INV-10231", "caseNumber": "2026-4839201",
  "status": "registered",            // registered | manual_review | rejected
  "nextAction": "Inkassovarsel sendes skyldner (14 dagers frist)",
  "claimCheck": { "decision": "approved", "checks": [ { "key": "duplicate", "status": "ok", … } ] }
}`}</Code>
      </Endpoint>

      <Endpoint method="GET" path="/api/partner/v1/cases/{id}">
        <p>Henter status på en sak.</p>
      </Endpoint>

      <section className="rounded-2xl bg-white ring-1 ring-black/5 p-6 text-sm">
        <h2 className="font-semibold text-base">Kravkontroll (lik for alle kanaler)</h2>
        <ul className="mt-3 grid sm:grid-cols-2 gap-2 text-ink-soft">
          <li>• Kreditor er BankID-verifisert og kundekontrollert (KYC/AML)</li>
          <li>• Skyldner finnes og er aktiv (Brønnøysund / Folkeregisteret)</li>
          <li>• Kreditor og skyldner er ikke samme bedrift</li>
          <li>• Kravet er forfalt og ikke foreldet (3 år)</li>
          <li>• Beløp innenfor grense for automatisk behandling</li>
          <li>• Ikke sendt inn tidligere (duplikatkontroll)</li>
          <li>• Faktura verifisert i ERP eller vedlagt dokument</li>
          <li>• Avvik → manuell kontroll, brudd → avvist</li>
        </ul>
      </section>
    </div>
  );
}
