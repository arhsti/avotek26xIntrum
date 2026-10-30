// Målbildet i tre tall: dagens prosess (overstreket) mot ny flyt
const GOALS = [
  { k: "Manuelle steg", a: "7+", b: "0" },
  { k: "Roller involvert per ny kunde", a: "4", b: "0 – kun ved avvik" },
  { k: "Tid til første sak", a: "Dager–uker", b: "Minutter" },
];

export function GoalStats() {
  return (
    <div>
      <div className="grid sm:grid-cols-3 gap-4">
        {GOALS.map((s) => (
          <div key={s.k} className="rounded-2xl bg-white ring-1 ring-black/5 p-5">
            <div className="text-sm text-ink-soft">{s.k}</div>
            <div className="mt-2 flex items-baseline gap-3">
              <span className="text-lg text-ink-soft line-through">{s.a}</span>
              <span className="text-2xl font-bold text-brand-700">{s.b}</span>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-ink-soft">Anslag til diskusjon, basert på dagens prosessbeskrivelse.</p>
    </div>
  );
}
