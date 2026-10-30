import type { DebtCase } from "./types";

/** Kundens tidslinje for en sak: hva har skjedd, hva skjer nå, og hva skjer videre (med omtrentlig dato). */

export type TimelineStep = {
  key: string;
  title: string;
  detail: string;
  state: "done" | "current" | "upcoming";
  date?: string;
  approx?: boolean;
};

const DAY = 86400000;
const fmt = (d: Date) => d.toLocaleDateString("nb-NO", { day: "numeric", month: "short" });

type CaseLike = Pick<DebtCase, "events" | "reminderAlreadySent" | "status" | "disputed" | "claimCheck" | "submittedAt">;

export function caseTimeline(c: CaseLike): TimelineStep[] {
  const events = c.events ?? [];
  const has = (code: string) => events.find((e) => e.code === code);
  const start = new Date(events[0]?.at ?? c.submittedAt ?? Date.now()).getTime();
  const review = c.status === "manual_review" || Boolean(has("manual_review")) || Boolean(c.disputed);
  // Dokumentert inkassovarsel: vi starter med betalingsoppfordring
  const noticeDocumented =
    c.reminderAlreadySent && !c.claimCheck?.checks.some((k) => k.key === "notice" && k.status !== "ok");

  const plan: { key: string; title: string; detail: string; day: number; done?: string }[] = [
    { key: "registered", title: "Saken er registrert", detail: "Kravet er kontrollert og ligger hos Intrum", day: 0, done: has("registered")?.at },
    ...(review
      ? [{ key: "review", title: "Kontroll hos saksbehandler", detail: c.disputed ? "Vi ser på innsigelsen før noe sendes" : "Innen 1 virkedag", day: 1, done: has("approved")?.at }]
      : []),
    ...(!noticeDocumented
      ? [{ key: "notice", title: "Inkassovarsel til skyldner", detail: "Skyldner får 14 dager på å betale, uten ekstra kostnad", day: review ? 1 : 0, done: has("notice_sent")?.at }]
      : []),
    {
      key: "payment_request",
      title: "Betalingsoppfordring",
      detail: "Inkassosalær legges til kravet – betales av skyldner",
      day: noticeDocumented ? (review ? 1 : 0) : review ? 16 : 15,
      done: has("payment_request")?.at,
    },
    { key: "followup", title: "Oppfølging av skyldner", detail: "SMS, telefon og tilbud om avdragsavtale", day: noticeDocumented ? 14 : 29, done: has("debtor_contacted")?.at },
    { key: "paid", title: "Skyldner betaler", detail: "Du får beskjed i portalen", day: noticeDocumented ? 21 : 35, done: has("paid")?.at },
    { key: "settled", title: "Utbetaling til deg", detail: "Til kontoen din", day: noticeDocumented ? 25 : 40, done: has("settled")?.at },
  ];

  let currentSet = false;
  return plan.map((p) => {
    if (p.done) return { key: p.key, title: p.title, detail: p.detail, state: "done" as const, date: fmt(new Date(p.done)) };
    const state = currentSet ? ("upcoming" as const) : ("current" as const);
    currentSet = true;
    return { key: p.key, title: p.title, detail: p.detail, state, date: fmt(new Date(start + p.day * DAY)), approx: p.day > 1 };
  });
}
