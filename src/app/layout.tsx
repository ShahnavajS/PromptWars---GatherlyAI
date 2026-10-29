import type { Metadata, Viewport } from 'next';
import './globals.css';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Gatherly AI — Plan smarter. Spend wisely. Bring everyone together.',
  description:
    'GenAI-powered event planning and coordination platform. Indian-first with deterministic budget intelligence and multi-day ceremony planning.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ea580c',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="flex min-h-full flex-col bg-[#fffdfa] text-slate-800 antialiased selection:bg-orange-100 selection:text-orange-900">
        <header className="sticky top-0 z-40 border-b border-amber-200/60 bg-[#fffdfa]/90 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <Link href="/" className="group flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 text-white shadow-sm shadow-orange-500/20 transition-transform group-hover:scale-105">
                  <span className="text-xl font-bold">✨</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-extrabold tracking-tight text-slate-900">
                      Gatherly<span className="text-orange-600">.ai</span>
                    </span>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                      Phase 2 Core
                    </span>
                  </div>
                  <p className="hidden text-xs text-slate-500 sm:block">
                    Plan smarter. Spend wisely. Bring everyone together.
                  </p>
                </div>
              </Link>
            </div>

            <nav className="flex items-center gap-3 sm:gap-4">
              <Link
                href="/"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-amber-100/60 hover:text-slate-900 transition-colors"
              >
                My Events
              </Link>
              <Link
                href="/events/new"
                className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-500 active:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-all"
              >
                <span>+</span> Plan New Event
              </Link>
            </nav>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="mt-auto border-t border-amber-100 bg-[#faf7f0] py-6 text-center text-xs text-slate-500">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p>© 2026 Gatherly AI. Deterministic Event Planning & Coordination.</p>
            <p className="text-slate-400">
              India-First Architecture • Asia/Kolkata • Minor-Unit Paise Arithmetic
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
