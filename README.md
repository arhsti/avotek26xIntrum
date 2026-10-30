# Intrum SMB-onboarding – prototype

Prototype på ny digital kundereise for SMB-kunder: fra første besøk til første innsendte inkassosak, og skalering via ERP-partnere.
Laget til Avo fagdag 30.10.2026. **Alle data og integrasjoner er fiktive.**

## Hva prototypen viser

| Side | Innhold |
|---|---|
| `/` | Inngang og oversikt |
| `/onboarding` | Selvbetjent flyt: org.nr → BankID (signaturrett + KYC/AML) → kontakt og konto → signer **Intrum Optimal** → første sak (faktura-OCR eller manuelt) → kravkontroll → automatisk provisjonering |
| `/erp-demo` | Simulert regnskapssystem. Aktiverer kunden via onboarding-lenke, sender krav via partner-API og henter status tilbake |
| `/portal` | Kundeportal: saksgang, livssyklus for kravet og meldinger med saksbehandler |
| `/partner` | API-dokumentasjon for ERP-leverandører |
| `/admin` | Innsikt: trakt, konvertering, median tid til første sak, saker, integrasjonslogg |
| `/sammenligning` | I dag vs. ny flyt, ansvarsdeling ERP/portal, forutsetninger |
| `/arkitektur` | Mapping til MuleSoft, Azure/.NET, workers og veien til Pink |

### Testdata

| Org.nr | Bedrift | Scenario |
|---|---|---|
| 923 456 783 | Fjellheim Rørlegger AS | Standard (Kari Nordmann er daglig leder) |
| 987 654 325 | Bølgen Kafé AS | Kari har ikke signaturrett → avtalen sendes til Per Olsen |
| 812 345 672 | Nordlys Elektro | Enkeltpersonforetak (Ola Hansen) |
| 934 567 897 | Gammel Handel AS | Under konkurs → stoppes |

Andre gyldige org.nr gir en generert fiktiv bedrift. BankID-testbrukere: Kari Nordmann, Ola Hansen, Per Olsen.

## Kjør lokalt

```bash
npm install
npm run dev
```

Uten `DATABASE_URL` lagres data i `.data/db.json`.

## Deploy til Vercel

1. Push repoet til GitHub og importer det i Vercel (Next.js oppdages automatisk).
2. Legg til en Postgres-database: **Storage → Marketplace → Neon**. Den setter `DATABASE_URL` automatisk. Tabellen opprettes ved første kall.
3. Valgfritt: `ADMIN_PASSWORD` (beskytter `/admin`, brukernavn `admin`) og `MOCK_FAILURE_RATE` (f.eks. `0.1` for å demonstrere feilhåndtering og retry).

Uten database på Vercel brukes en midlertidig fil i `/tmp` – data kan forsvinne mellom kall. Bruk Postgres for demo.

## Struktur

- `lib/integrations.ts` – fiktive integrasjoner (Brreg, BankID, KYC, Kontoregister, OCR, Salesforce, MuleSoft/Pink, e-post, ERP) med forsinkelse og logging
- `lib/claimChecks.ts` – kravkontroll (regelmotor), lik for skjema og ERP
- `lib/onboarding.ts` – onboarding-steg og provisjonering (idempotent, strømmes til klienten)
- `lib/partners.ts` – partner-API (onboarding-lenker, saker, status)
- `lib/lifecycle.ts` – fiktivt saksforløp og meldinger
- `lib/db.ts` – enkel dokumentdatabase (Postgres `records`-tabell med jsonb, eller JSON-fil)
