"use client";
import { useMemo, useState } from "react";
import { FLOWS, JOURNEYS, PHASES, PROCESS_STEPS, SYSTEMS, type Flow, type JourneyId, type SystemId, type SystemNode } from "@/lib/dataflow";
import { Badge, cx } from "@/components/ui";

export type LiveCall = { at: string; action: string; request: unknown; response: unknown; status: string };
export type LiveOnboarding = {
  id: string;
  label: string;
  calls: Partial<Record<SystemId, LiveCall[]>>;
  pinkPayload: unknown;
};

const W = 1080;
const H = 640;

function size(n: SystemNode) {
  return n.kind === "mulesoft" ? { w: 210, h: 150 } : n.x > 800 ? { w: 220, h: 52 } : { w: 210, h: 64 };
}

const KIND_STYLE: Record<SystemNode["kind"], string> = {
  kanal: "bg-brand-600 text-white border-brand-600",
  mulesoft: "bg-sky-50 text-sky-950 border-sky-300",
  ekstern: "bg-white text-ink border-black/15",
  intrum: "bg-ink text-white border-ink",
};

const byId = Object.fromEntries(SYSTEMS.map((s) => [s.id, s])) as Record<SystemId, SystemNode>;

// Én linje per systempar, med alle dataflytene som går der
type Edge = { key: string; a: SystemId; b: SystemId; flows: Flow[] };
const EDGES: Edge[] = Object.values(
  FLOWS.reduce<Record<string, Edge>>((acc, f) => {
    const key = [f.from, f.to].sort().join("|");
    (acc[key] ??= { key, a: f.from, b: f.to, flows: [] }).flows.push(f);
    return acc;
  }, {}),
);
EDGES.push({ key: "experience|process", a: "experience", b: "process", flows: [] });

function geometry(e: Edge) {
  const A = byId[e.a];
  const B = byId[e.b];
  const sa = size(A);
  const sb = size(B);
  const [L, R, sl, sr] = A.x <= B.x ? [A, B, sa, sb] : [B, A, sb, sa];
  const x1 = L.x + sl.w;
  const y1 = L.y + sl.h / 2;
  const x2 = R.x;
  const y2 = R.y + sr.h / 2;
  const dx = Math.max(40, (x2 - x1) / 2);
  return { d: `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`, mx: (x1 + x2) / 2, my: (y1 + y2) / 2 };
}

type Selection = { type: "system"; id: SystemId } | { type: "edge"; key: string } | { type: "phase"; n: number } | null;

export function DataFlowMap({ live }: { live: LiveOnboarding[] }) {
  const [journey, setJourney] = useState<JourneyId | "all">("all");
  const [sel, setSel] = useState<Selection>({ type: "phase", n: 1 });
  const [liveId, setLiveId] = useState(live[0]?.id ?? "");
  const liveData = live.find((l) => l.id === liveId);

  const step = sel?.type === "phase" ? PROCESS_STEPS.find((p) => p.phase === sel.n) : undefined;
  const activeFlows = useMemo(
    () => (step ? FLOWS.filter((f) => step.next.flows.includes(f.id)) : FLOWS.filter((f) => journey === "all" || f.journey === journey)),
    [journey, step],
  );
  const activeIds = new Set(activeFlows.map((f) => f.id));

  const isEdgeLit = (e: Edge) => {
    if (e.key === "experience|process") return true;
    const inJourney = e.flows.some((f) => activeIds.has(f.id));
    if (!inJourney) return false;
    if (!sel || sel.type === "phase") return true;
    if (sel.type === "edge") return sel.key === e.key;
    return e.a === sel.id || e.b === sel.id;
  };
  const isNodeLit = (id: SystemId) => {
    const touching = activeFlows.some((f) => f.from === id || f.to === id) || id === "experience" || id === "process";
    if (!touching) return false;
    if (!sel || sel.type === "phase") return true;
    if (sel.type === "system") return sel.id === id || activeFlows.some((f) => (f.from === sel.id && f.to === id) || (f.to === sel.id && f.from === id));
    const e = EDGES.find((x) => x.key === sel.key);
    return e ? e.a === id || e.b === id : true;
  };

  const panelFlows: { heading: string; flows: Flow[] }[] = (() => {
    if (!sel) return [];
    if (sel.type === "phase") return [{ heading: "Data i ny flyt", flows: activeFlows }];
    if (sel.type === "edge") return [{ heading: "Dataflyt på linjen", flows: (EDGES.find((e) => e.key === sel.key)?.flows ?? []).filter((f) => activeIds.has(f.id)) }];
    return [
      { heading: "Data inn", flows: activeFlows.filter((f) => f.to === sel.id) },
      { heading: "Data ut", flows: activeFlows.filter((f) => f.from === sel.id) },
    ];
  })();

  const selectedSystem = sel?.type === "system" ? byId[sel.id] : null;
  const liveCalls = selectedSystem && liveData ? liveData.calls[selectedSystem.id] ?? [] : [];

  return (
    <div className="space-y-5">
      <section>
        <h2 className="font-semibold">Etter at SMB-kunden har fylt ut skjemaet</h2>
        <p className="text-sm text-ink-soft">Fasene fra Intrums prosesskart. Trykk på en fase for å se hva som skjer hos Intrum – i dag og i ny flyt – og hvilke data som flyter.</p>
        <ol className="mt-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {PROCESS_STEPS.map((p) => {
            const active = sel?.type === "phase" && sel.n === p.phase;
            return (
              <li key={p.phase}>
                <button
                  onClick={() => setSel({ type: "phase", n: p.phase })}
                  className={cx(
                    "w-full h-full text-left rounded-xl p-3 ring-1 transition",
                    active ? "bg-ink text-white ring-ink" : "bg-white ring-black/10 hover:ring-brand-400",
                  )}
                >
                  <div className={cx("text-[11px] font-semibold", active ? "text-brand-200" : "text-brand-700")}>Fase {p.phase}</div>
                  <div className="text-sm font-semibold leading-tight">{PHASES[p.phase]}</div>
                  <div className={cx("mt-2 text-[11px] leading-snug", active ? "text-white/70" : "text-ink-soft")}>
                    <span className="line-through">{p.today.who}</span> → {p.next.who}
                  </div>
                </button>
              </li>
            );
          })}
        </ol>
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-ink-soft mr-1">Eller vis hele flyten:</span>
        {[{ id: "all" as const, name: "Alle" }, ...JOURNEYS].map((j) => (
          <button
            key={j.id}
            onClick={() => {
              setJourney(j.id);
              setSel(null);
            }}
            className={cx(
              "rounded-full px-3.5 py-1.5 text-sm font-medium ring-1",
              journey === j.id && sel?.type !== "phase" ? "bg-ink text-white ring-ink" : "bg-white ring-black/10 hover:ring-brand-400",
            )}
          >
            {j.name}
          </button>
        ))}
        {journey !== "all" && <span className="text-sm text-ink-soft">{JOURNEYS.find((j) => j.id === journey)?.description}</span>}
      </div>

      <div className="rounded-2xl bg-white ring-1 ring-black/5 p-3 overflow-x-auto">
        <div className="relative min-w-[900px]" style={{ aspectRatio: `${W} / ${H}` }}>
          <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 size-full" aria-hidden>
            {EDGES.map((e) => {
              const g = geometry(e);
              const lit = isEdgeLit(e);
              const selected = sel?.type === "edge" && sel.key === e.key;
              return (
                <g key={e.key}>
                  <path d={g.d} fill="none" stroke={lit ? (selected ? "#5d22b8" : "#8a4fe8") : "#e7e5e4"} strokeWidth={selected ? 4 : lit ? 2.5 : 1.5} />
                  <path
                    d={g.d}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={16}
                    className="cursor-pointer pointer-events-auto"
                    onClick={() => e.flows.length && setSel({ type: "edge", key: e.key })}
                  />
                </g>
              );
            })}
          </svg>
          {/* Tellere midt på linjene: hvor mange dataflyter */}
          {EDGES.filter((e) => e.flows.length && isEdgeLit(e)).map((e) => {
            const g = geometry(e);
            const n = e.flows.filter((f) => activeIds.has(f.id)).length;
            return (
              <button
                key={e.key + "-n"}
                onClick={() => setSel({ type: "edge", key: e.key })}
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-white ring-1 ring-brand-400 text-[11px] font-semibold text-brand-700 px-1.5 min-w-5 h-5 hover:bg-brand-50"
                style={{ left: `${(g.mx / W) * 100}%`, top: `${(g.my / H) * 100}%` }}
                aria-label={`${n} dataflyter`}
              >
                {n}
              </button>
            );
          })}
          {SYSTEMS.map((n) => {
            const s = size(n);
            const lit = isNodeLit(n.id);
            const selected = sel?.type === "system" && sel.id === n.id;
            return (
              <button
                key={n.id}
                onClick={() => setSel(selected ? null : { type: "system", id: n.id })}
                className={cx(
                  "absolute rounded-xl border text-left px-3 py-2 transition shadow-sm",
                  KIND_STYLE[n.kind],
                  !lit && "opacity-30",
                  selected && "ring-4 ring-brand-400",
                )}
                style={{ left: `${(n.x / W) * 100}%`, top: `${(n.y / H) * 100}%`, width: `${(s.w / W) * 100}%`, height: `${(s.h / H) * 100}%` }}
              >
                <div className="text-[13px] font-semibold leading-tight">{n.name}</div>
                <div className={cx("text-[11px] leading-tight mt-0.5", n.kind === "kanal" || n.kind === "intrum" ? "text-white/75" : "text-ink-soft")}>{n.note}</div>
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-4 px-2 pt-3 text-xs text-ink-soft">
          <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-brand-600" />Kanal</span>
          <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-sky-100 ring-1 ring-sky-300" />MuleSoft</span>
          <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-white ring-1 ring-black/20" />Eksternt register</span>
          <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-ink" />Intrum-system</span>
          <span>Trykk på et system eller et tall på en linje for å se dataene.</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-5 items-start">
        <div className="rounded-2xl bg-white ring-1 ring-black/5 p-5 min-w-0">
          {!sel && <p className="text-sm text-ink-soft">Velg et system eller en linje i kartet.</p>}
          {step && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold">
                Fase {step.phase} · {PHASES[step.phase]}
              </h2>
              <div className="mt-3 grid md:grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-amber-50 ring-1 ring-amber-200 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-amber-800">I dag · {step.today.who}</div>
                  <ul className="mt-2 space-y-1">
                    {step.today.what.map((w) => (
                      <li key={w}>• {w}</li>
                    ))}
                  </ul>
                  <div className="mt-2 text-xs text-ink-soft">{step.today.systems}</div>
                  <div className="mt-1 text-xs font-semibold text-amber-800">{step.today.pain}</div>
                </div>
                <div className="rounded-xl bg-brand-50 ring-1 ring-brand-200 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-brand-700">Ny flyt · {step.next.who}</div>
                  <ul className="mt-2 space-y-1">
                    {step.next.what.map((w) => (
                      <li key={w}>• {w}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
          {selectedSystem && (
            <div className="mb-4">
              <h2 className="text-xl font-semibold">{selectedSystem.name}</h2>
              <p className="text-sm text-ink-soft">{selectedSystem.note}</p>
            </div>
          )}
          {panelFlows.map((group) =>
            group.flows.length === 0 ? null : (
              <div key={group.heading} className="mb-6 last:mb-0">
                <div className="text-xs font-semibold uppercase tracking-wide text-ink-soft mb-2">{group.heading}</div>
                <div className="space-y-4">
                  {group.flows.map((fl) => (
                    <div key={fl.id} className="rounded-xl ring-1 ring-black/5 overflow-hidden">
                      <div className="flex flex-wrap items-center justify-between gap-2 bg-canvas px-4 py-2.5">
                        <div className="font-medium text-sm">
                          {fl.title} <span className="text-ink-soft font-normal">· {byId[fl.from].name} → {byId[fl.to].name}</span>
                        </div>
                        <Badge>
                          Fase {fl.phase} · {PHASES[fl.phase]}
                        </Badge>
                      </div>
                      <table className="w-full text-sm">
                        <tbody className="divide-y divide-black/5">
                          {fl.fields.map((fd) => (
                            <tr key={fd.name} className="align-top">
                              <td className="px-4 py-2 font-medium w-[38%]">{fd.name}</td>
                              <td className="py-2 text-ink-soft">{fd.example}</td>
                              <td className="px-4 py-2 text-xs text-ink-soft text-right whitespace-nowrap">{fd.source}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              </div>
            ),
          )}
          {sel && panelFlows.every((g) => g.flows.length === 0) && <p className="text-sm text-ink-soft">Ingen dataflyt i valgt flyt.</p>}
        </div>

        <aside className="rounded-2xl bg-white ring-1 ring-black/5 p-5 space-y-3 min-w-0">
          <div>
            <h2 className="font-semibold">Ekte data fra prototypen</h2>
            <p className="text-sm text-ink-soft">Velg en kunde for å se hva som faktisk ble sendt til systemet du har valgt.</p>
          </div>
          {live.length === 0 ? (
            <p className="text-sm text-ink-soft">Ingen fullførte kunder ennå. Gå gjennom onboardingen først.</p>
          ) : (
            <select
              value={liveId}
              onChange={(e) => setLiveId(e.target.value)}
              className="w-full rounded-xl border border-black/15 bg-white px-3 py-2.5 text-sm"
              aria-label="Kunde"
            >
              {live.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
          )}
          {selectedSystem?.id === "pink" && liveData && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-ink-soft mb-1">Dette sendes til Pink (klient og saker)</div>
              <pre className="rounded-xl bg-ink text-brand-50 p-3 text-[11px] leading-relaxed overflow-auto max-h-[420px]">
                {JSON.stringify(liveData.pinkPayload, null, 2)}
              </pre>
            </div>
          )}
          {selectedSystem && liveData && (
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Kall i loggen ({liveCalls.length})</div>
              {liveCalls.length === 0 && <p className="text-sm text-ink-soft">Ingen kall til {selectedSystem.name} for denne kunden.</p>}
              {liveCalls.map((c, i) => (
                <details key={i} className="rounded-lg bg-canvas px-3 py-2 text-sm">
                  <summary className="cursor-pointer">
                    <span className="font-mono text-[11px]">{c.action}</span>
                  </summary>
                  <pre className="mt-2 text-[11px] overflow-auto max-h-60">{JSON.stringify({ sendt: c.request, svar: c.response }, null, 2)}</pre>
                </details>
              ))}
            </div>
          )}
          {!selectedSystem && <p className="text-sm text-ink-soft">Velg et system i kartet.</p>}
        </aside>
      </div>
    </div>
  );
}
