"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function ResetButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function reset() {
    if (!confirm("Slette alle kunder, saker og logger i demoen?")) return;
    setBusy(true);
    await fetch("/api/intrum/reset", { method: "POST" });
    try {
      localStorage.removeItem("intrum-onboarding-id");
      localStorage.removeItem("intrum-portal-id");
      localStorage.removeItem("erp-demo-org");
    } catch {}
    setBusy(false);
    router.refresh();
  }

  return (
    <button onClick={reset} disabled={busy} className="rounded-lg ring-1 ring-white/30 text-brand-100 px-3 py-1 text-xs hover:bg-white/10 disabled:opacity-50">
      {busy ? "Nullstiller …" : "Nullstill demodata"}
    </button>
  );
}
