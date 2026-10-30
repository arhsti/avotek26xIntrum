"use client";
import { forwardRef } from "react";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export function Button({
  variant = "primary",
  loading,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost"; loading?: boolean }) {
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed",
        variant === "primary" && "bg-brand-600 text-white hover:bg-brand-700",
        variant === "secondary" && "bg-white text-ink ring-1 ring-inset ring-black/10 hover:bg-brand-50",
        variant === "ghost" && "text-brand-700 hover:bg-brand-50",
        className,
      )}
    >
      {loading && <Spinner className="size-4" />}
      {children}
    </button>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cx("animate-spin", className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity=".25" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Check({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path fillRule="evenodd" d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0Z" clipRule="evenodd" />
    </svg>
  );
}

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string }>(
  function Input({ label, hint, error, className, ...props }, ref) {
    return (
      <label className={cx("block", className)}>
        <span className="block text-sm font-medium mb-1.5">{label}</span>
        <input
          ref={ref}
          {...props}
          className={cx(
            "w-full rounded-xl border bg-white px-4 py-3 text-base outline-none transition focus:ring-4",
            error ? "border-red-400 focus:ring-red-100" : "border-black/15 focus:border-brand-500 focus:ring-brand-100",
          )}
        />
        {hint && !error && <span className="block text-xs text-ink-soft mt-1.5">{hint}</span>}
        {error && <span className="block text-xs text-red-600 mt-1.5">{error}</span>}
      </label>
    );
  },
);

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cx("rounded-2xl bg-white ring-1 ring-black/5 shadow-sm", className)}>{children}</div>;
}

export function ErrorBox({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="rounded-xl bg-red-50 text-red-800 ring-1 ring-red-200 px-4 py-3 text-sm animate-fade-up">
      {message}
    </div>
  );
}

export function Badge({ tone = "brand", children }: { tone?: "brand" | "green" | "amber" | "gray" | "red"; children: React.ReactNode }) {
  const tones = {
    brand: "bg-brand-100 text-brand-700",
    green: "bg-emerald-100 text-emerald-800",
    amber: "bg-amber-100 text-amber-800",
    gray: "bg-black/5 text-ink-soft",
    red: "bg-red-100 text-red-700",
  };
  return <span className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap", tones[tone])}>{children}</span>;
}

export async function api<T = unknown>(path: string, body?: unknown, method: "GET" | "POST" = "POST"): Promise<T> {
  const isForm = body instanceof FormData;
  const res = await fetch(path, {
    method,
    headers: isForm || method === "GET" ? undefined : { "Content-Type": "application/json" },
    body: method === "GET" ? undefined : isForm ? body : JSON.stringify(body ?? {}),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Noe gikk galt");
  return data as T;
}
