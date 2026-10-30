'use client';

import { useState } from 'react';

interface Props {
  eventId: string;
  vendorId: string;
  onSaved: () => Promise<void> | void;
  onCancel: () => void;
}

export default function VendorQuoteForm({ eventId, vendorId, onSaved, onCancel }: Props) {
  const [form, setForm] = useState({
    quoteTitle: '', quotedAmountRupees: '', quoteDate: '', inclusions: '', exclusions: '', cancellationPolicy: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveQuote() {
    setError(null);
    const amountPaise = Math.round(Number(form.quotedAmountRupees) * 100);
    if (!form.quoteTitle.trim() || !form.quoteDate || !form.quotedAmountRupees.trim() || !Number.isSafeInteger(amountPaise) || amountPaise < 0) {
      setError('Add a quote title, date, and valid amount.');
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/events/${eventId}/quotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId,
          quoteTitle: form.quoteTitle.trim(),
          quotedAmountPaise: amountPaise,
          quoteDate: form.quoteDate,
          inclusions: form.inclusions.split('\n').map((value) => value.trim()).filter(Boolean),
          exclusions: form.exclusions.split('\n').map((value) => value.trim()).filter(Boolean),
          cancellationPolicy: form.cancellationPolicy || null,
        }),
      });
      const result = await response.json();
      if (!result.success) {
        setError(result.error || 'Could not add this quote.');
        return;
      }
      await onSaved();
    } catch {
      setError('Could not connect to the server.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-[#d5e1d3] bg-white p-4 space-y-3">
      <h4 className="text-sm font-bold text-slate-800">Add Quote</h4>
      {error && <p role="alert" className="text-sm text-[#9b4333]">{error}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${vendorId}-quote-title`} className="block text-xs font-bold text-slate-700 mb-1">Quote Title *</label>
          <input
            id={`${vendorId}-quote-title`}
            type="text"
            value={form.quoteTitle}
            onChange={(e) => setForm((f) => ({ ...f, quoteTitle: e.target.value }))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#285942]"
          />
        </div>
        <div>
          <label htmlFor={`${vendorId}-quote-amount`} className="block text-xs font-bold text-slate-700 mb-1">Amount (₹) *</label>
          <input
            id={`${vendorId}-quote-amount`}
            type="number"
            min={0}
            step={0.01}
            value={form.quotedAmountRupees}
            onChange={(e) => setForm((f) => ({ ...f, quotedAmountRupees: e.target.value }))}
            placeholder="0"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#285942]"
          />
        </div>
        <div>
          <label htmlFor={`${vendorId}-quote-date`} className="block text-xs font-bold text-slate-700 mb-1">Date *</label>
          <input
            id={`${vendorId}-quote-date`}
            type="date"
            value={form.quoteDate}
            onChange={(e) => setForm((f) => ({ ...f, quoteDate: e.target.value }))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#285942]"
          />
        </div>
        <div>
          <label htmlFor={`${vendorId}-quote-cancellation`} className="block text-xs font-bold text-slate-700 mb-1">Cancellation Policy</label>
          <input
            id={`${vendorId}-quote-cancellation`}
            type="text"
            value={form.cancellationPolicy}
            onChange={(e) => setForm((f) => ({ ...f, cancellationPolicy: e.target.value }))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#285942]"
          />
        </div>
        <div>
          <label htmlFor={`${vendorId}-quote-inclusions`} className="block text-xs font-bold text-slate-700 mb-1">Inclusions (one per line)</label>
          <textarea
            id={`${vendorId}-quote-inclusions`}
            rows={3}
            value={form.inclusions}
            onChange={(e) => setForm((f) => ({ ...f, inclusions: e.target.value }))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#285942]"
          />
        </div>
        <div>
          <label htmlFor={`${vendorId}-quote-exclusions`} className="block text-xs font-bold text-slate-700 mb-1">Exclusions (one per line)</label>
          <textarea
            id={`${vendorId}-quote-exclusions`}
            rows={3}
            value={form.exclusions}
            onChange={(e) => setForm((f) => ({ ...f, exclusions: e.target.value }))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#285942]"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={saveQuote}
          disabled={saving}
          className="rounded-lg bg-[#285942] px-3 py-2 text-xs font-bold text-white hover:bg-[#1e4734] disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Add Quote'}
        </button>
        <button
          onClick={onCancel}
          className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
