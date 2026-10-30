import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import SessionNav from '@/components/auth/SessionNav';
import './globals.css';

export const metadata: Metadata = {
  title: 'Gatherly | Make more room for the moments',
  description: 'A thoughtful planning space for weddings, birthdays, and community gatherings. Shape your ideas, budget, timeline, and vendor checklist in one place.',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#f8f5ee' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className="flex min-h-screen flex-col">
        <a href="#main-content" className="sr-only rounded-lg bg-white px-4 py-3 text-sm font-bold text-[#263b34] focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100]">Skip to content</a>
        <header className="sticky top-0 z-40 border-b border-[#e2e6da] bg-[#f8f5ee]/95 backdrop-blur-md">
          <div className="page-wrap flex min-h-[76px] items-center justify-between gap-4 py-3">
            <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="Gatherly home">
              <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#285942] text-[26px] leading-none text-[#f6dfac]">✳</span>
              <span className="font-editorial text-[1.8rem] leading-none tracking-[-.07em] text-[#263b34]">gatherly<span className="text-[#9e4b35]">.</span></span>
            </Link>
            <nav aria-label="Main navigation" className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-3">
              <Link href="/" className="hidden rounded-xl px-3 py-2 text-sm font-semibold text-[#435a4e] hover:bg-[#e8efe5] sm:inline-flex">My events</Link>
              <SessionNav />
              <Link href="/events/new" className="button-primary whitespace-nowrap px-3.5 sm:px-5"><span aria-hidden="true">＋</span><span className="hidden sm:inline">Plan an event</span><span className="sm:hidden">New event</span></Link>
            </nav>
          </div>
        </header>
        <main id="main-content" className="flex-1">{children}</main>
        <footer className="mt-20 border-t border-[#e2e6da] bg-[#f1f1e8]">
          <div className="page-wrap flex flex-col gap-4 py-8 text-sm text-[#596860] sm:flex-row sm:items-center sm:justify-between">
            <p><span className="font-editorial text-lg text-[#263b34]">gatherly.</span> &nbsp; A little more joy in the making.</p>
            <p>Plan thoughtfully. Make it yours.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
