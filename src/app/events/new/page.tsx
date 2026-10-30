'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatCompactINR } from '@/lib/domain/formatting';

const eventTypes = [
  { type: 'WEDDING', label: 'Wedding', note: 'Ceremonies, guests and the big day', color: 'bg-[#f6e5de]' },
  { type: 'BIRTHDAY', label: 'Birthday', note: 'A milestone worth celebrating', color: 'bg-[#f6eac9]' },
  { type: 'COMMUNITY', label: 'Community', note: 'Something wonderful together', color: 'bg-[#e4efe3]' },
  { type: 'CELEBRATION', label: 'Other celebration', note: 'Your occasion, your own way', color: 'bg-[#eae5f2]' },
];

export default function CreateEventPage() {
  return <Suspense fallback={<div className="page-wrap py-12">Preparing your event form…</div>}><CreateEventForm /></Suspense>;
}

function CreateEventForm() {
  const router = useRouter();
  const requestedType = useSearchParams().get('type');
  const [form, setForm] = useState({
    title: '', eventType: eventTypes.some((option) => option.type === requestedType) ? requestedType || '' : '', startDate: '', endDate: '', venueCity: '',
    venueName: '', targetGuestCount: 50, totalBudgetRupees: 100000,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const issues: Record<string, string> = {};
    if (!form.eventType) issues.eventType = 'Choose the kind of event you are planning.';
    if (!form.title.trim()) issues.title = 'Give your event a name.';
    if (!form.startDate) issues.startDate = 'Choose a start date.';
    if (form.endDate && form.endDate < form.startDate) issues.endDate = 'End date must be on or after the start date.';
    if (!form.venueCity.trim()) issues.venueCity = 'Add the city or location.';
    if (form.targetGuestCount < 1) issues.targetGuestCount = 'Enter at least one guest.';
    if (form.totalBudgetRupees < 1000) issues.totalBudgetRupees = 'Budget must be at least ₹1,000.';
    setFieldErrors(issues);
    if (Object.keys(issues).length) return;

    setLoading(true);
    try {
      const response = await fetch('/api/events', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, endDate: form.endDate || undefined }),
      });
      const result = await response.json();
      if (result.success && result.data?.event?.id) {
        router.push('/events/' + result.data.event.id);
        return;
      }
      if (Array.isArray(result.issues)) {
        const serverIssues: Record<string, string> = {};
        result.issues.forEach((issue: { field: string; message: string }) => { serverIssues[issue.field] = issue.message; });
        setFieldErrors(serverIssues);
      } else setError(result.error || 'Your event could not be created. Please try again.');
    } catch {
      setError('We could not connect to the server. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-wrap py-10 sm:py-16">
      <nav aria-label="Breadcrumb" className="mb-8 text-sm text-[#596860]"><Link href="/" className="underline underline-offset-4 hover:text-[#285942]">Your events</Link><span className="mx-2" aria-hidden="true">/</span><span aria-current="page">New event</span></nav>
      <div className="grid gap-10 lg:grid-cols-[.75fr_1.25fr] lg:gap-16">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <p className="eyebrow">A beautiful beginning</p>
          <h1 className="font-editorial mt-4 text-[clamp(3rem,5vw,5.2rem)] leading-[1.02] tracking-[-.06em]">Tell us what you&apos;re dreaming up.</h1>
          <p className="mt-6 max-w-sm text-base leading-7 text-[#596860]">A few details are enough to begin. We&apos;ll make a starter budget and checklist that you can reshape as plans come together.</p>
          <div className="mt-10 max-w-sm rounded-[22px] bg-[#e6eee2] p-6">
            <span className="font-editorial text-4xl text-[#285942]" aria-hidden="true">✳</span>
            <p className="mt-3 text-sm leading-6 text-[#435a4e]">Your plan stays in your hands. Ideas from AI are shown for review before they change your workspace.</p>
          </div>
        </div>

        <div className="surface-card p-6 sm:p-9">
          <div className="border-b border-[#e2e6da] pb-6"><p className="eyebrow">01 / Event details</p><h2 className="font-editorial mt-2 text-3xl tracking-[-.04em]">Start with the essentials.</h2></div>
          {error && <p role="alert" className="mt-6 rounded-xl bg-[#fff0eb] p-4 text-sm font-semibold text-[#8f4938]">{error}</p>}
          <form onSubmit={handleSubmit} className="mt-7 space-y-8" noValidate>
            <fieldset>
              <legend className="form-label">What are we celebrating? <span aria-hidden="true">*</span></legend>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {eventTypes.map((option) => (
                  <button key={option.type} type="button" aria-pressed={form.eventType === option.type} onClick={() => { setForm({ ...form, eventType: option.type }); setFieldErrors({ ...fieldErrors, eventType: '' }); }} className={'min-h-[116px] rounded-[18px] border p-4 text-left transition-colors ' + option.color + (form.eventType === option.type ? ' border-[#285942] ring-2 ring-[#285942]' : ' border-transparent hover:border-[#8cae91]')}>
                    <span className="block text-base font-bold text-[#263b34]">{option.label}</span><span className="mt-2 block text-sm leading-5 text-[#596860]">{option.note}</span>
                  </button>
                ))}
              </div>
              {fieldErrors.eventType && <p role="alert" className="mt-2 text-sm text-[#9b4333]">{fieldErrors.eventType}</p>}
            </fieldset>
            <div>
              <label htmlFor="title" className="form-label">Give it a name <span aria-hidden="true">*</span></label>
              <input id="title" type="text" required maxLength={150} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="e.g. Nisha's 30th, The Neighbourhood Fair" aria-invalid={Boolean(fieldErrors.title)} aria-describedby={fieldErrors.title ? 'title-error' : undefined} className="form-control" />
              {fieldErrors.title && <p id="title-error" role="alert" className="mt-2 text-sm text-[#9b4333]">{fieldErrors.title}</p>}
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div><label htmlFor="startDate" className="form-label">Start date <span aria-hidden="true">*</span></label><input id="startDate" type="date" required value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} aria-invalid={Boolean(fieldErrors.startDate)} aria-describedby={fieldErrors.startDate ? 'start-error' : undefined} className="form-control" />{fieldErrors.startDate && <p id="start-error" role="alert" className="mt-2 text-sm text-[#9b4333]">{fieldErrors.startDate}</p>}</div>
              <div><label htmlFor="endDate" className="form-label">End date <span className="font-normal text-[#596860]">(if multi-day)</span></label><input id="endDate" type="date" min={form.startDate || undefined} value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} aria-invalid={Boolean(fieldErrors.endDate)} aria-describedby={fieldErrors.endDate ? 'end-error' : undefined} className="form-control" />{fieldErrors.endDate && <p id="end-error" role="alert" className="mt-2 text-sm text-[#9b4333]">{fieldErrors.endDate}</p>}</div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div><label htmlFor="venueCity" className="form-label">City or location <span aria-hidden="true">*</span></label><input id="venueCity" type="text" required maxLength={100} value={form.venueCity} onChange={(event) => setForm({ ...form, venueCity: event.target.value })} placeholder="e.g. Ahmedabad" aria-invalid={Boolean(fieldErrors.venueCity)} aria-describedby={fieldErrors.venueCity ? 'city-error' : undefined} className="form-control" />{fieldErrors.venueCity && <p id="city-error" role="alert" className="mt-2 text-sm text-[#9b4333]">{fieldErrors.venueCity}</p>}</div>
              <div><label htmlFor="venueName" className="form-label">Venue <span className="font-normal text-[#596860]">(optional)</span></label><input id="venueName" type="text" maxLength={150} value={form.venueName} onChange={(event) => setForm({ ...form, venueName: event.target.value })} placeholder="Add it when you know" className="form-control" /></div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div><label htmlFor="guestCount" className="form-label">Expected guests <span aria-hidden="true">*</span></label><input id="guestCount" type="number" min={1} max={50000} required value={form.targetGuestCount} onChange={(event) => setForm({ ...form, targetGuestCount: Number(event.target.value) })} aria-invalid={Boolean(fieldErrors.targetGuestCount)} className="form-control" />{fieldErrors.targetGuestCount && <p role="alert" className="mt-2 text-sm text-[#9b4333]">{fieldErrors.targetGuestCount}</p>}</div>
              <div><label htmlFor="budget" className="form-label">Planned budget <span className="font-normal text-[#596860]">(INR)</span></label><input id="budget" type="number" min={1000} max={1000000000} step={1000} required value={form.totalBudgetRupees} onChange={(event) => setForm({ ...form, totalBudgetRupees: Number(event.target.value) })} aria-invalid={Boolean(fieldErrors.totalBudgetRupees)} className="form-control" /><p className="mt-2 text-xs text-[#596860]">About {formatCompactINR(form.totalBudgetRupees * 100)} for the whole event.</p>{fieldErrors.totalBudgetRupees && <p role="alert" className="mt-2 text-sm text-[#9b4333]">{fieldErrors.totalBudgetRupees}</p>}</div>
            </div>
            <div className="flex flex-col-reverse gap-3 border-t border-[#e2e6da] pt-7 sm:flex-row sm:justify-end"><Link href="/" className="button-secondary">Back to events</Link><button type="submit" disabled={loading} className="button-primary">{loading ? 'Making your plan…' : 'Create my planning space'} <span aria-hidden="true">↗</span></button></div>
          </form>
        </div>
      </div>
    </div>
  );
}
