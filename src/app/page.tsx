'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { EventListItem } from '@/lib/services/eventService';
import { formatCompactINR, formatDate, calculateDaysRemaining } from '@/lib/domain/formatting';

export default function HomePage() {
  const router = useRouter();
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seedingDemo, setSeedingDemo] = useState(false);

  useEffect(() => {
    let ignore = false;

    fetch('/api/events')
      .then((res) => res.json())
      .then((data) => {
        if (ignore) return;
        if (data.success) {
          setEvents(data.events);
        } else {
          setError(data.error || 'Failed to load events.');
        }
      })
      .catch(() => {
        if (!ignore) {
          setError('Could not connect to event service.');
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  const handleCreateDemoEvent = async () => {
    try {
      setSeedingDemo(true);
      const demoPayload = {
        title: "Priya & Rohan's Gujarati Wedding",
        eventType: 'WEDDING',
        startDate: '2026-11-20',
        endDate: '2026-11-22',
        venueCity: 'Ahmedabad',
        venueName: 'The Grand Bhagwati',
        targetGuestCount: 250,
        totalBudgetRupees: 1500000,
        timezone: 'Asia/Kolkata',
      };

      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(demoPayload),
      });

      const data = await res.json();
      if (data.success && data.data?.event?.id) {
        router.push(`/events/${data.data.event.id}`);
      } else {
        setError(data.error || 'Failed to seed sample event.');
      }
    } catch {
      setError('Error creating sample event.');
    } finally {
      setSeedingDemo(false);
    }
  };

  const getBadgeStyle = (type: string) => {
    switch (type.toUpperCase()) {
      case 'WEDDING':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'BIRTHDAY':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'COMMUNITY':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-purple-100 text-purple-800 border-purple-200';
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Hero Welcome Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-50 via-orange-50/60 to-rose-50 border border-amber-200/80 p-8 sm:p-12 shadow-sm mb-10">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-orange-100/80 px-3 py-1 text-xs font-semibold text-orange-800 border border-orange-200 mb-4">
            <span>🎉</span>
            <span>Connected & Deterministic Event Planning</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 leading-tight">
            Plan smarter. Spend wisely. <br className="hidden sm:inline" />
            <span className="text-orange-600">Bring everyone together.</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            Turn your event idea into an organized, mathematically exact, and editable workspace.
            Track budgets in integer paise, coordinate multi-day timelines, and stay in complete control.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/events/new"
              className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-6 py-3.5 text-base font-bold text-white shadow-md shadow-orange-600/20 hover:bg-orange-500 active:bg-orange-700 transition-all focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
            >
              <span>+</span>
              <span>Create New Event</span>
            </Link>

            <button
              onClick={handleCreateDemoEvent}
              disabled={seedingDemo}
              className="inline-flex items-center gap-2 rounded-xl bg-white border border-amber-300 px-5 py-3.5 text-base font-semibold text-slate-800 hover:bg-amber-50 active:bg-amber-100 transition-all shadow-sm disabled:opacity-60"
            >
              <span>{seedingDemo ? 'Creating...' : '⚡ Quick Demo: Gujarati Wedding'}</span>
            </button>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-12 -bottom-12 h-64 w-64 rounded-full bg-gradient-to-tr from-orange-300/30 to-amber-200/40 blur-3xl" />
      </section>

      {/* Events Workspace Section */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Your Planning Workspaces</h2>
            <p className="text-sm text-slate-500">
              Active events with live budget allocation and task progress.
            </p>
          </div>
          <Link
            href="/events/new"
            className="text-sm font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1"
          >
            + New Event
          </Link>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-64 animate-pulse rounded-2xl border border-amber-200/60 bg-amber-50/40 p-6"
              />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-amber-300/80 bg-amber-50/20 p-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-3xl">
              🎈
            </div>
            <h3 className="mt-4 text-xl font-bold text-slate-800">No events planned yet</h3>
            <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
              Ready to start? Plan a wedding, milestone birthday, or community festival in minutes with
              deterministic budget calculations.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link
                href="/events/new"
                className="rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-orange-500"
              >
                Create Event
              </Link>
              <button
                onClick={handleCreateDemoEvent}
                disabled={seedingDemo}
                className="rounded-xl border border-amber-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-amber-50"
              >
                Seed Sample Gujarati Wedding
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((ev) => {
              const countdown = calculateDaysRemaining(ev.startDate);
              const allocatedPercent =
                ev.totalBudgetPaise > 0
                  ? Math.min(100, Math.round((ev.allocatedTotalPaise / ev.totalBudgetPaise) * 100))
                  : 0;

              return (
                <div
                  key={ev.id}
                  className="group relative flex flex-col justify-between rounded-2xl border border-amber-200/80 bg-white p-6 shadow-sm transition-all hover:border-orange-400 hover:shadow-md"
                >
                  <div>
                    {/* Header: Badges */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getBadgeStyle(
                          ev.eventType
                        )}`}
                      >
                        {ev.eventType}
                      </span>
                      <span className="text-xs font-medium text-slate-500 bg-slate-100 rounded-md px-2 py-0.5">
                        {countdown.label}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-orange-600 transition-colors line-clamp-1">
                      {ev.title}
                    </h3>

                    {/* Meta info */}
                    <div className="mt-2 space-y-1 text-xs text-slate-500">
                      <p className="flex items-center gap-1.5">
                        <span>📍</span>
                        <span>{ev.venueCity}</span>
                        {ev.targetGuestCount > 0 && <span>• {ev.targetGuestCount} guests</span>}
                      </p>
                      <p className="flex items-center gap-1.5">
                        <span>📅</span>
                        <span>
                          {formatDate(ev.startDate, { format: 'short' })}
                          {ev.endDate ? ` – ${formatDate(ev.endDate, { format: 'short' })}` : ''}
                        </span>
                      </p>
                    </div>

                    {/* Budget Overview */}
                    <div className="mt-5 border-t border-amber-100 pt-4">
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-slate-500 font-medium">Budget Allocated</span>
                        <span className="font-bold text-slate-800">
                          {formatCompactINR(ev.allocatedTotalPaise)} / {formatCompactINR(ev.totalBudgetPaise)}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full transition-all ${
                            allocatedPercent > 100
                              ? 'bg-red-500'
                              : allocatedPercent >= 80
                              ? 'bg-amber-500'
                              : 'bg-orange-500'
                          }`}
                          style={{ width: `${Math.min(100, allocatedPercent)}%` }}
                        />
                      </div>
                    </div>

                    {/* Task progress */}
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                      <span>Tasks:</span>
                      <span className="font-semibold text-slate-700">
                        {ev.completedTasksCount} of {ev.totalTasksCount} done
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-6 border-t border-amber-100 pt-4">
                    <Link
                      href={`/events/${ev.id}`}
                      className="block w-full rounded-xl bg-orange-50 px-4 py-2.5 text-center text-sm font-bold text-orange-700 hover:bg-orange-600 hover:text-white transition-colors"
                    >
                      Open Event Workspace →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
