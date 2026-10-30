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
    <button onClick={reset} disabled={busy} className="rounded-lg ring-1 ring-red-300 text-red-700 px-3 py-1.5 text-sm hover:bg-red-50 disabled:opacity-50">
      {busy ? "Nullstiller …" : "Nullstill demodata"}
    </button>
  );
}
