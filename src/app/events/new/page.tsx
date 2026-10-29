'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatCompactINR } from '@/lib/domain/formatting';

export default function CreateEventPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    title: '',
    eventType: 'WEDDING',
    startDate: '',
    endDate: '',
    venueCity: 'Ahmedabad',
    venueName: '',
    targetGuestCount: 200,
    totalBudgetRupees: 1000000, // ₹10 Lakh default
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const eventTypeOptions = [
    { type: 'WEDDING', label: 'Wedding', icon: '💍', desc: 'Multi-ceremony traditions, catering, decor & guests' },
    { type: 'BIRTHDAY', label: 'Birthday Party', icon: '🎂', desc: 'Milestone celebrations, food, music & entertainment' },
    { type: 'COMMUNITY', label: 'Community Gathering', icon: '🤝', desc: 'Festivals, mela, association meets & volunteers' },
    { type: 'CELEBRATION', label: 'Family Celebration', icon: '🎊', desc: 'Anniversaries, reunions, pujas & social gatherings' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    // Client-side quick checks
    if (!formData.title.trim()) {
      setFieldErrors((prev) => ({ ...prev, title: 'Please provide an event title.' }));
      return;
    }
    if (!formData.startDate) {
      setFieldErrors((prev) => ({ ...prev, startDate: 'Please select a start date.' }));
      return;
    }
    if (formData.endDate && new Date(formData.endDate) < new Date(formData.startDate)) {
      setFieldErrors((prev) => ({ ...prev, endDate: 'End date must be on or after start date.' }));
      return;
    }
    if (formData.targetGuestCount <= 0) {
      setFieldErrors((prev) => ({ ...prev, targetGuestCount: 'Guest count must be at least 1.' }));
      return;
    }
    if (formData.totalBudgetRupees < 1000) {
      setFieldErrors((prev) => ({ ...prev, totalBudgetRupees: 'Budget must be at least ₹1,000.' }));
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          endDate: formData.endDate ? formData.endDate : undefined,
        }),
      });

      const data = await res.json();
      if (data.success && data.data?.event?.id) {
        router.push(`/events/${data.data.event.id}`);
      } else {
        if (data.issues && Array.isArray(data.issues)) {
          const mapped: Record<string, string> = {};
          data.issues.forEach((issue: { field: string; message: string }) => {
            mapped[issue.field] = issue.message;
          });
          setFieldErrors(mapped);
        } else {
          setError(data.error || 'Failed to create event. Please try again.');
        }
      }
    } catch {
      setError('An unexpected network error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Breadcrumb Navigation */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-slate-500">
        <Link href="/" className="hover:text-slate-800 transition-colors">
          Home
        </Link>
        <span>/</span>
        <span className="text-slate-800 font-semibold">Create New Event</span>
      </nav>

      <div className="rounded-3xl border border-amber-200/80 bg-white p-6 sm:p-10 shadow-sm">
        <div className="border-b border-amber-100 pb-6 mb-8">
          <span className="text-xs font-bold uppercase tracking-wider text-orange-600">
            Step 1: Event Fundamentals
          </span>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-slate-900">
            Set up your planning workspace
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-600">
            Provide your event requirements. Gatherly will generate a deterministic budget breakdown
            and actionable starter checklist.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <span className="font-bold">Error:</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Event Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-bold text-slate-800 mb-1.5">
              Event Title <span className="text-rose-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              required
              placeholder="e.g. Priya & Rohan's Gujarati Wedding"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className={`w-full rounded-xl border px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                fieldErrors.title ? 'border-red-400 bg-red-50/20' : 'border-slate-300'
              }`}
            />
            {fieldErrors.title && <p className="mt-1 text-xs text-red-600">{fieldErrors.title}</p>}
          </div>

          {/* Event Type Grid */}
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-2">
              Event Category <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {eventTypeOptions.map((opt) => {
                const isSelected = formData.eventType === opt.type;
                return (
                  <button
                    type="button"
                    key={opt.type}
                    onClick={() => setFormData({ ...formData, eventType: opt.type })}
                    className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-all ${
                      isSelected
                        ? 'border-orange-500 bg-orange-50/60 ring-2 ring-orange-500 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-amber-300 hover:bg-amber-50/20'
                    }`}
                  >
                    <span className="text-2xl">{opt.icon}</span>
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{opt.label}</div>
                      <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dates Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="startDate" className="block text-sm font-bold text-slate-800 mb-1.5">
                Event Date (or Start Date) <span className="text-rose-500">*</span>
              </label>
              <input
                id="startDate"
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className={`w-full rounded-xl border px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                  fieldErrors.startDate ? 'border-red-400 bg-red-50/20' : 'border-slate-300'
                }`}
              />
              {fieldErrors.startDate && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.startDate}</p>
              )}
            </div>

            <div>
              <label htmlFor="endDate" className="block text-sm font-bold text-slate-800 mb-1.5">
                End Date <span className="text-xs font-normal text-slate-500">(Optional for multi-day events)</span>
              </label>
              <input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className={`w-full rounded-xl border px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                  fieldErrors.endDate ? 'border-red-400 bg-red-50/20' : 'border-slate-300'
                }`}
              />
              {fieldErrors.endDate && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.endDate}</p>
              )}
            </div>
          </div>

          {/* Location & Guests Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="venueCity" className="block text-sm font-bold text-slate-800 mb-1.5">
                City / Location <span className="text-rose-500">*</span>
              </label>
              <input
                id="venueCity"
                type="text"
                required
                placeholder="e.g. Ahmedabad, Mumbai, Jaipur"
                value={formData.venueCity}
                onChange={(e) => setFormData({ ...formData, venueCity: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label htmlFor="venueName" className="block text-sm font-bold text-slate-800 mb-1.5">
                Venue Name <span className="text-xs font-normal text-slate-500">(Optional)</span>
              </label>
              <input
                id="venueName"
                type="text"
                placeholder="e.g. The Grand Bhagwati"
                value={formData.venueName}
                onChange={(e) => setFormData({ ...formData, venueName: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label htmlFor="targetGuestCount" className="block text-sm font-bold text-slate-800 mb-1.5">
                Expected Guests <span className="text-rose-500">*</span>
              </label>
              <input
                id="targetGuestCount"
                type="number"
                min="1"
                max="50000"
                required
                value={formData.targetGuestCount}
                onChange={(e) =>
                  setFormData({ ...formData, targetGuestCount: parseInt(e.target.value, 10) || 0 })
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          {/* Total Budget in INR */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5">
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="totalBudgetRupees" className="block text-sm font-bold text-slate-900">
                Total Planned Budget (INR ₹) <span className="text-rose-500">*</span>
              </label>
              <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-bold text-orange-800">
                {formatCompactINR(formData.totalBudgetRupees * 100)}
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-lg font-bold text-slate-500">₹</span>
              <input
                id="totalBudgetRupees"
                type="number"
                min="1000"
                max="1000000000"
                step="5000"
                required
                value={formData.totalBudgetRupees}
                onChange={(e) =>
                  setFormData({ ...formData, totalBudgetRupees: parseInt(e.target.value, 10) || 0 })
                }
                className="w-full rounded-xl border border-amber-300 bg-white pl-9 pr-4 py-3 text-lg font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <p className="mt-2 text-xs text-slate-600">
              Deterministic calculations will allocate this ceiling across catering, venue, decor,
              entertainment, and a 10% contingency reserve in integer paise.
            </p>
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-amber-100">
            <Link
              href="/"
              className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-7 py-3 text-sm font-bold text-white shadow-md shadow-orange-600/20 hover:bg-orange-500 active:bg-orange-700 transition-all disabled:opacity-60"
            >
              {loading ? 'Creating Workspace...' : 'Initialize Planning Workspace →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
