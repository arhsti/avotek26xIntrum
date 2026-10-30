import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Intrum SMB-onboarding – prototype",
  description: "Prototype på ny digital kundereise fra første besøk til første innsendte inkassosak.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nb">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen antialiased">
        <div className="bg-ink text-center text-xs text-brand-100 py-1.5 px-4">
          Prototype – alle data og integrasjoner er fiktive
        </div>
        <header className="bg-white border-b border-black/5">
          <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-ink">intrum</span>
              <span className="text-xs font-medium text-brand-600 uppercase tracking-wider">Bedrift</span>
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <Link href="/sammenligning" className="hidden md:block px-3 py-2 rounded-lg hover:bg-brand-50">I dag vs. ny flyt</Link>
              <Link href="/portal" className="hidden sm:block px-3 py-2 rounded-lg hover:bg-brand-50">Kundeportal</Link>
              <Link href="/admin" className="px-3 py-2 rounded-lg hover:bg-brand-50">Innsikt</Link>
              <Link href="/onboarding" className="ml-1 px-4 py-2 rounded-lg bg-brand-600 text-white font-medium hover:bg-brand-700">Bli kunde</Link>
            </nav>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
