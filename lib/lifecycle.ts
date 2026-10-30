import "server-only";
import { db } from "./db";
import type { CaseEvent, CaseMessage, DebtCase } from "./types";

/**
 * Forenklet, fiktivt saksforløp. I prototypen drives det manuelt («Simuler neste hendelse»)
 * – i virkeligheten kommer hendelsene fra Pink via integrasjonslaget.
 */

const now = () => new Date().toISOString();

export function initialEvents(manualReview: boolean, at = now()): CaseEvent[] {
  return [
    { at, code: "registered", label: "Sak registrert hos Intrum" },
    ...(manualReview ? [{ at, code: "manual_review", label: "Til kontroll hos saksbehandler" }] : []),
  ];
}

function nextEvent(c: DebtCase): Omit<CaseEvent, "at"> | null {
  const codes = (c.events ?? []).map((e) => e.code);
  const last = codes.at(-1);
  if (c.status === "rejected") return null;
  if (last === "manual_review") return { code: "approved", label: "Kontrollert og godkjent av saksbehandler" };
  if (!codes.includes("notice_sent") && !codes.includes("payment_request")) {
    return c.reminderAlreadySent
      ? { code: "payment_request", label: "Betalingsoppfordring sendt til skyldner" }
      : { code: "notice_sent", label: "Inkassovarsel sendt til skyldner (14 dagers frist)" };
  }
  if (!codes.includes("payment_request")) return { code: "payment_request", label: "Betalingsoppfordring sendt til skyldner" };
  if (!codes.includes("debtor_contacted")) return { code: "debtor_contacted", label: "Skyldner kontaktet på SMS og telefon" };
  if (!codes.includes("paid")) return { code: "paid", label: "Skyldner har betalt hele kravet" };
  if (!codes.includes("settled")) return { code: "settled", label: "Beløpet er utbetalt til din konto – sak avsluttet" };
  return null;
}

export function phaseOf(c: DebtCase) {
  const last = (c.events ?? []).at(-1);
  if (c.status === "rejected") return { code: "rejected", label: "Avvist i kravkontroll" };
  return last ? { code: last.code, label: last.label } : { code: "draft", label: "Ikke sendt" };
}

export async function advanceCase(caseId: string) {
  const c = await db.get<DebtCase>("cases", caseId);
  if (!c) return null;
  const next = nextEvent(c);
  if (!next) return c;
  const events = [...(c.events ?? []), { ...next, at: now() }];
  return db.update<DebtCase>("cases", caseId, {
    events,
    status: next.code === "approved" ? "registered" : c.status,
  });
}

function cannedReply(text: string) {
  const t = text.toLowerCase();
  if (t.includes("betalt")) return "Takk! Vi sjekker innbetalingen mot saken og avslutter den når betalingen er bekreftet.";
  if (t.includes("stopp") || t.includes("trekk")) return "Vi har stoppet videre purringer mens vi ser på saken. Ønsker du å trekke saken helt, bekrefter du det her.";
  if (t.includes("avdrag") || t.includes("nedbetal")) return "Skyldner har mulighet til avdragsavtale. Vi foreslår en plan og ber om din godkjenning før den inngås.";
  return "Takk for meldingen! Den er lagt på saken, og en saksbehandler svarer innen 1 virkedag.";
}

export async function addMessage(caseId: string, text: string) {
  const c = await db.get<DebtCase>("cases", caseId);
  if (!c) return null;
  const messages: CaseMessage[] = [
    ...(c.messages ?? []),
    { at: now(), from: "kunde", text },
    { at: new Date(Date.now() + 1000).toISOString(), from: "intrum", text: cannedReply(text) },
  ];
  return db.update<DebtCase>("cases", caseId, { messages });
}
