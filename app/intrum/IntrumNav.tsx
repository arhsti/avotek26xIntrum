"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/components/ui";

const TABS = [
  { href: "/intrum/dataflyt", label: "Dataflyt" },
  { href: "/intrum/implementering", label: "Implementering med Avo" },
  { href: "/intrum/prosess", label: "Prosess i dag vs. ny" },
];

export function IntrumNav() {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto -mx-4 px-4" aria-label="Intrum">
      {TABS.map((t) => {
        const active = t.href === "/intrum" ? path === "/intrum" : path.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cx(
              "whitespace-nowrap px-3 py-2.5 text-sm border-b-2",
              active ? "border-brand-400 text-white font-semibold" : "border-transparent text-brand-100 hover:text-white",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
