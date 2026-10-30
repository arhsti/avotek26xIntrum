import { IntrumNav } from "./IntrumNav";

// Intern visning for Intrum: innsikt, dataflyt, prosjektplan og prosess
export default function IntrumLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <div className="bg-ink text-white">
        <div className="mx-auto max-w-6xl px-4 pt-4">
          <div className="text-xs uppercase tracking-wider text-brand-200">Intrum – intern visning</div>
          <IntrumNav />
        </div>
      </div>
      {children}
    </div>
  );
}
