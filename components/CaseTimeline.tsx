"use client";
import type { TimelineStep } from "@/lib/timeline";
import { Check, cx } from "./ui";

export function CaseTimeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <div>
      <ol className="relative">
        {steps.map((s, i) => (
          <li key={s.key} className="flex gap-4 pb-5 last:pb-0 relative">
            {i < steps.length - 1 && (
              <span aria-hidden className={cx("absolute left-[11px] top-6 bottom-0 w-0.5", s.state === "done" ? "bg-brand-400" : "bg-black/10")} />
            )}
            <span
              className={cx(
                "relative z-10 size-6 shrink-0 rounded-full grid place-items-center",
                s.state === "done" && "bg-brand-600 text-white",
                s.state === "current" && "bg-white ring-2 ring-brand-600",
                s.state === "upcoming" && "bg-white ring-2 ring-black/15",
              )}
            >
              {s.state === "done" ? <Check className="size-3.5" /> : s.state === "current" ? <span className="size-2 rounded-full bg-brand-600" /> : null}
            </span>
            <div className="flex-1 min-w-0 flex flex-wrap justify-between gap-x-4">
              <div>
                <div className={cx("font-medium", s.state === "upcoming" && "text-ink-soft")}>{s.title}</div>
                <div className="text-sm text-ink-soft">{s.detail}</div>
              </div>
              <div className={cx("text-sm tabular-nums whitespace-nowrap", s.state === "current" ? "text-brand-700 font-medium" : "text-ink-soft")}>
                {s.approx && s.state !== "done" ? "ca. " : ""}
                {s.date}
              </div>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-xs text-ink-soft">Betaler ikke skyldner? Da anbefaler vi rettslig inkasso – og avtaler det med deg først.</p>
    </div>
  );
}
