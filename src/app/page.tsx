'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { EventListItem } from '@/lib/services/eventService';
import { formatCompactINR, formatDate, calculateDaysRemaining } from '@/lib/domain/formatting';

const occasions = [
  { name: 'Weddings', type: 'WEDDING', line: 'A day that feels entirely like you.', tone: 'bg-[#f1ddd5]', accent: 'text-[#8c4737]', mark: '01' },
  { name: 'Birthdays', type: 'BIRTHDAY', line: 'Make another trip around the sun count.', tone: 'bg-[#f5e9c8]', accent: 'text-[#735b28]', mark: '02' },
  { name: 'Community', type: 'COMMUNITY', line: 'Bring people together for something bigger.', tone: 'bg-[#dceade]', accent: 'text-[#315947]', mark: '03' },
];
const eventTones: Record<string, string> = {
  WEDDING: 'bg-[#f7e6e1] text-[#8f4938]',
  BIRTHDAY: 'bg-[#f6edd2] text-[#76592f]',
  COMMUNITY: 'bg-[#e2eee4] text-[#285942]',
  CELEBRATION: 'bg-[#eae5f2] text-[#624f77]',
};

export default function HomePage() {
  const router = useRouter();
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seedingDemo, setSeedingDemo] = useState(false);

  useEffect(() => {
    let ignore = false;
    fetch('/api/auth/session', { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) return null;
        return fetch('/api/events', { cache: 'no-store' }).then((eventsResponse) => eventsResponse.json());
      })
      .then((result) => {
        if (ignore) return;
        if (!result) return;
        setSignedIn(true);
        if (result.success) setEvents(result.events);
        else setError(result.error || 'Your events could not be loaded.');
      })
      .catch(() => { if (!ignore) setError('Your events could not be loaded.'); })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, []);

  async function createSample() {
    if (!signedIn) { router.push('/sign-in?next=%2F'); return; }
    setSeedingDemo(true);
    setError(null);
    const start = new Date();
    start.setUTCDate(start.getUTCDate() + 30);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 2);
    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: "Priya & Rohan's Gujarati Wedding",
          eventType: 'WEDDING',
          startDate: start.toISOString().slice(0, 10),
          endDate: end.toISOString().slice(0, 10),
          venueCity: 'Ahmedabad',
          venueName: 'The Grand Bhagwati',
          targetGuestCount: 250,
          totalBudgetRupees: 1500000,
          timezone: 'Asia/Kolkata',
          culturalPreset: 'GUJARATI',
          dietaryPreference: 'PURE_VEG',
        }),
      });
      const result = await response.json();
      if (result.success && result.data?.event?.id) router.push('/events/' + result.data.event.id);
      else setError(result.error || 'The sample event could not be created.');
    } catch {
      setError('The sample event could not be created.');
    } finally {
      setSeedingDemo(false);
    }
  }

  return (
    <div>
      <section className="page-wrap relative mt-4 min-h-[560px] overflow-hidden rounded-[28px] bg-[#eee7d9] sm:mt-6 sm:min-h-[630px]">
        <Image src="/images/gatherly-celebration.webp" alt="" fill priority sizes="(max-width: 700px) 100vw, 1240px" className="hero-image" />
        <div className="hero-wash absolute inset-0" />
        <div className="hero-enter relative z-10 flex min-h-[560px] max-w-[670px] flex-col justify-center px-6 py-16 sm:min-h-[630px] sm:px-12 lg:px-16">
          <p className="eyebrow">For every reason to gather</p>
          <h1 className="font-editorial mt-6 text-[clamp(3.4rem,6.6vw,6.7rem)] leading-[.98] tracking-[-.065em] text-[#263b34]">Make more room for the moments.</h1>
          <p className="mt-7 max-w-[490px] text-base leading-7 text-[#3d5347] sm:text-lg">Weddings, birthdays, community days and all the little milestones between. Turn a lovely idea into a plan you can actually enjoy.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/events/new" className="button-primary px-6">Start planning <span aria-hidden="true">↗</span></Link>
            <a href="#how-it-works" className="button-secondary px-6">See how it works</a>
          </div>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[.12em] text-[#596860]">Your ideas · Your budget · Your way</p>
        </div>
      </section>

      <section id="how-it-works" className="page-wrap scroll-mt-28 py-20 sm:py-24">
        <div className="grid gap-10 lg:grid-cols-[.9fr_1.1fr] lg:items-end">
          <div><p className="eyebrow">Thoughtful from the first idea</p><h2 className="font-editorial mt-3 max-w-xl text-4xl leading-tight tracking-[-.045em] sm:text-5xl">The details belong together.</h2></div>
          <p className="max-w-xl text-base leading-7 text-[#596860]">Start with what matters to you. Gatherly helps shape a budget, a to-do list, a day-of timeline and vendor needs in one calm place. AI ideas stay yours to review and change.</p>
        </div>
        <div className="mt-11 grid gap-4 md:grid-cols-3">
          {[
            ['01', 'Tell us the occasion', 'Add a date, place, guest count and the budget you want to work with.'],
            ['02', 'Find your rhythm', 'See starter tasks and allocations, then ask for ideas tailored to your event.'],
            ['03', 'Make it yours', 'Review every suggestion before it joins your plan. Adjust as life changes.'],
          ].map(([number, title, description]) => (
            <div key={number} className="surface-card p-6 sm:p-7">
              <span className="font-editorial text-4xl text-[#9e4b35]">{number}</span>
              <h3 className="mt-7 text-lg font-bold text-[#263b34]">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#596860]">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#e9eee4] py-20 sm:py-24">
        <div className="page-wrap">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div><p className="eyebrow">One place, many celebrations</p><h2 className="font-editorial mt-3 text-4xl tracking-[-.045em] sm:text-5xl">Whatever brings you together.</h2></div>
            <Link href="/events/new" className="button-text self-start">Plan your occasion <span aria-hidden="true">↗</span></Link>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {occasions.map((occasion) => (
              <Link key={occasion.name} href={'/events/new?type=' + occasion.type} className={'event-card flex min-h-[270px] flex-col justify-between rounded-[24px] p-7 ' + occasion.tone}>
                <span className={'font-editorial text-5xl opacity-60 ' + occasion.accent} aria-hidden="true">{occasion.mark}</span>
                <div><h3 className="font-editorial text-3xl tracking-[-.04em]">{occasion.name}</h3><p className="mt-2 max-w-[240px] text-sm leading-6">{occasion.line}</p><span className="mt-5 inline-block border-b border-current pb-1 text-sm font-bold">Explore planning ↗</span></div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="my-events" className="page-wrap scroll-mt-28 py-20 sm:py-24" aria-labelledby="my-events-title">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="eyebrow">Your planning space</p><h2 id="my-events-title" className="font-editorial mt-3 text-4xl tracking-[-.045em] sm:text-5xl">Your events</h2><p className="mt-2 text-sm text-[#596860]">Pick up right where you left off.</p></div>
          <Link href="/events/new" className="button-secondary">＋ New event</Link>
        </div>
        {error && <div role="alert" className="mt-8 rounded-xl border border-[#d8a597] bg-[#fff3ee] p-4 text-sm text-[#7d3b2d]">{error}</div>}
        {loading ? (
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3" aria-label="Loading events">{[1, 2, 3].map((item) => <div key={item} className="surface-card h-64 animate-pulse bg-[#e9eee4]" />)}</div>
        ) : !signedIn ? (
          <div className="surface-card mt-8 grid gap-6 p-8 sm:grid-cols-[1fr_auto] sm:items-center sm:p-10">
            <div><span className="eyebrow">A private planning space</span><h3 className="font-editorial mt-2 text-3xl">Your events are yours to see.</h3><p className="mt-3 max-w-xl text-sm leading-6 text-[#596860]">Sign in to open your plans, or create an account to start a new one.</p></div>
            <Link href="/sign-in" className="button-primary">Sign in to your events</Link>
          </div>
        ) : events.length === 0 ? (
          <div className="surface-card mt-8 grid gap-6 p-8 sm:grid-cols-[1fr_auto] sm:items-center sm:p-10">
            <div><span className="eyebrow">A fresh page</span><h3 className="font-editorial mt-2 text-3xl">Every great gathering starts somewhere.</h3><p className="mt-3 max-w-xl text-sm leading-6 text-[#596860]">Add your first event to see its budget and checklist. Want to look around first? Create a clearly marked sample wedding in your workspace.</p></div>
            <div className="flex flex-col gap-3"><Link href="/events/new" className="button-primary">Create an event</Link><button type="button" onClick={createSample} disabled={seedingDemo} className="button-secondary">{seedingDemo ? 'Creating sample…' : 'Create sample wedding'}</button></div>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => {
              const percent = event.totalBudgetPaise > 0 ? Math.min(100, Math.round(event.allocatedTotalPaise / event.totalBudgetPaise * 100)) : 0;
              return (
                <Link key={event.id} href={'/events/' + event.id} className="event-card surface-card group flex min-h-[290px] flex-col p-6">
                  <div className="flex items-center justify-between gap-2"><span className={'rounded-full px-3 py-1 text-xs font-bold ' + (eventTones[event.eventType] || eventTones.CELEBRATION)}>{event.eventType.toLowerCase()}</span><span className="text-xs font-semibold text-[#596860]">{calculateDaysRemaining(event.startDate).label}</span></div>
                  <h3 className="font-editorial mt-7 text-[1.8rem] leading-tight tracking-[-.035em] group-hover:text-[#285942]">{event.title}</h3>
                  <p className="mt-3 text-sm text-[#596860]">{formatDate(event.startDate, { format: 'short' })}{event.endDate ? ' – ' + formatDate(event.endDate, { format: 'short' }) : ''} <span aria-hidden="true">·</span> {event.venueCity}</p>
                  <div className="mt-auto pt-7"><div className="mb-2 flex justify-between gap-2 text-xs font-semibold text-[#596860]"><span>Budget planned</span><span className="metric-number">{formatCompactINR(event.allocatedTotalPaise)} / {formatCompactINR(event.totalBudgetPaise)}</span></div><div role="progressbar" aria-label="Budget allocated" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} className="h-2 overflow-hidden rounded-full bg-[#e3e8dc]"><div className="h-full rounded-full bg-[#285942]" style={{ width: percent + '%' }} /></div><p className="mt-4 text-xs text-[#596860]">{event.completedTasksCount} of {event.totalTasksCount} tasks complete <span className="float-right font-bold text-[#285942]">Open plan ↗</span></p></div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
