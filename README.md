# Intrum SMB-onboarding – prototype

Prototype på ny digital kundereise for SMB-kunder: fra første besøk til første innsendte inkassosak, og skalering via ERP-partnere.
Laget til Avo fagdag 30.10.2026. **Alle data og integrasjoner er fiktive.**

## Hva prototypen viser

**Kundevisning**

| Side | Innhold |
|---|---|
| `/` | Inngang: last opp fakturaen |
| `/onboarding` | Faktura først → BankID (signatur fra Brønnøysund, KYC) → kontakt, konto og kvalifisering → signer **Intrum Optimal** → se over kravet → tidslinje for hva som skjer |
| `/priser` | Priser fra Intrum Optimal (vedlegg 1, 2026) og eksempel på salær med kalkulator |
| `/portal` | Kundeportal: tidslinje per sak, meldinger, brukere og fullmakter |
| `/erp-demo` | Simulert regnskapssystem som bruker partner-API-et |
| `/partner` | API-dokumentasjon for ERP-leverandører |

**Intrum-visning (`/intrum`, kan beskyttes med `ADMIN_PASSWORD`)**

| Side | Innhold |
|---|---|
| `/intrum` | Innsikt: trakt, KPI-er, oppfølgingsliste, saker, integrasjonslogg |
| `/intrum/dataflyt` | Hva skjer hos Intrum etter innsendt skjema – fase for fase (i dag vs. ny), klikkbart kart over hvilke data som går til Pink, Salesforce, Brønnøysund m.fl., med ekte data fra databasen |
| `/intrum/prosjektplan` | Dagens prosesskart som svømmebaner, plan nov 2026–des 2027 med faser og milepæler |
| `/intrum/prosess` | De seks fasene i dag vs. ny flyt, suksesskriterier og KPI-er |
| `/intrum/gevinster` | Hva det gir Intrum |
| `/intrum/arkitektur` | MuleSoft, Azure/.NET og veien til Pink |

### Testdata

| Org.nr | Bedrift | Scenario |
|---|---|---|
| 923 456 783 | Fjellheim Rørlegger AS | Standard (Kari Nordmann er daglig leder) |
| 987 654 325 | Bølgen Kafé AS | Kari har ikke signaturrett → avtalen sendes til Per Olsen |
| 913 579 240 | Havbris Transport AS | Signatur i fellesskap (Kari + Per). Ola Hansen har prokura og kan signere alene |
| 812 345 672 | Nordlys Elektro | Enkeltpersonforetak (Ola Hansen) |
| 934 567 897 | Gammel Handel AS | Under konkurs → stoppes |

Signatur og prokura hentes (fiktivt) fra Brønnøysundregistrene. De som må signere, signerer avtalen med BankID; den som registrerer uten signaturrett får fullmakt i avtalen. Kravkontrollen sjekker at innsender har signatur, prokura eller fullmakt, og i kundeportalen kan signaturberettigede gi fullmakt til regnskapsfører eller ansatte.

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
3. Valgfritt: `ADMIN_PASSWORD` (beskytter `/intrum`, brukernavn `admin`) og `MOCK_FAILURE_RATE` (f.eks. `0.1` for å demonstrere feilhåndtering og retry).

Uten database på Vercel brukes en midlertidig fil i `/tmp` – data kan forsvinne mellom kall. Bruk Postgres for demo.

## Struktur

- `lib/integrations.ts` – fiktive integrasjoner (Brreg, BankID, KYC, Kontoregister, OCR, Salesforce, MuleSoft/Pink, e-post, ERP) med forsinkelse og logging
- `lib/claimChecks.ts` – kravkontroll (regelmotor), lik for skjema og ERP
- `lib/onboarding.ts` – onboarding-steg og provisjonering (idempotent, strømmes til klienten)
- `lib/partners.ts` – partner-API (onboarding-lenker, saker, status)
- `lib/lifecycle.ts` – fiktivt saksforløp og meldinger
- `lib/db.ts` – enkel dokumentdatabase (Postgres `records`-tabell med jsonb, eller JSON-fil)
