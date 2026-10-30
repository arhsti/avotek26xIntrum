"use client";
import { useState } from "react";
import { salaryFor } from "@/lib/pricing";
import { nok } from "@/lib/validation";

export function SalaryCalculator() {
  const [amount, setAmount] = useState("18750");
  const value = Number(amount.replace(/\s/g, "").replace(",", ".")) || 0;
  const s = salaryFor(value);
  return (
    <div className="rounded-2xl bg-brand-50 p-5">
      <label className="block text-sm font-medium" htmlFor="calc">
        Hva kan skyldner måtte betale i salær?
      </label>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <input
          id="calc"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-40 rounded-xl border border-black/15 bg-white px-4 py-2.5 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
        />
        <span className="text-sm text-ink-soft">kr i krav</span>
      </div>
      {value > 0 && (
        <p className="mt-3 text-sm">
          <b>{nok(s.light)}</b> hvis skyldner betaler etter betalingsoppfordringen, opptil <b>{nok(s.heavy)}</b> ved videre oppfølging.
        </p>
      )}
    </div>
  );
}
