'use client';

import { useState } from 'react';
import { ExtractedQuotationCandidate } from '@/lib/services/quotationExtractionService';
import { useDialogFocus } from './useDialogFocus';

interface Vendor {
  id: string;
  name: string;
  category: string;
}

interface QuotationExtractionModalProps {
  candidate: ExtractedQuotationCandidate;
  vendors: Vendor[];
  eventId: string;
  onSaved: () => void;
  onClose: () => void;
}

const VENDOR_CATEGORIES = [
  'VENUE', 'CATERING', 'DECOR', 'PHOTOGRAPHY',
  'ENTERTAINMENT', 'TRANSPORTATION', 'INVITATIONS', 'GENERAL'
];

export default function QuotationExtractionModal({
  candidate,
  vendors,
  eventId,
  onSaved,
  onClose,
}: QuotationExtractionModalProps) {
  // Find if extracted vendor name matches an existing vendor
  const matchingVendor = candidate.vendorName.value
    ? vendors.find((v) => v.name.toLowerCase().includes(candidate.vendorName.value!.toLowerCase()))
    : null;

  const [vendorMode, setVendorMode] = useState<'EXISTING' | 'NEW'>(
    matchingVendor ? 'EXISTING' : vendors.length > 0 ? 'EXISTING' : 'NEW'
  );
  const [selectedVendorId, setSelectedVendorId] = useState<string>(
    matchingVendor?.id || (vendors[0]?.id ?? '')
  );
  const [newVendorName, setNewVendorName] = useState<string>(
    candidate.vendorName.value || ''
  );
  const [newVendorCategory, setNewVendorCategory] = useState<string>('CATERING');

  const [quoteTitle, setQuoteTitle] = useState(candidate.quoteTitle.value);
  const [amountRupees, setAmountRupees] = useState(
    candidate.quotedAmountPaise.value
      ? (candidate.quotedAmountPaise.value / 100).toString()
      : ''
  );
  const [currency] = useState(candidate.currency.value || 'INR');
  const [quoteDate, setQuoteDate] = useState(
    candidate.quoteDate.value || new Date().toISOString().split('T')[0]
  );
  const [validUntilDate, setValidUntilDate] = useState(
    candidate.validUntilDate.value || ''
  );
  const [inclusionsText, setInclusionsText] = useState(
    candidate.inclusions.value.join('\n')
  );
  const [exclusionsText, setExclusionsText] = useState(
    candidate.exclusions.value.join('\n')
  );
  const [cancellationPolicy, setCancellationPolicy] = useState(
    candidate.cancellationPolicy.value || ''
  );
  const [notes, setNotes] = useState(candidate.notes.value || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useDialogFocus(onClose);

  const renderProvenanceBadge = (status: 'EXTRACTED' | 'NOT_PROVIDED' | 'USER_CONFIRMED') => {
    if (status === 'EXTRACTED') {
      return (
        <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-xs font-bold text-emerald-800">
          ✓ Extracted
        </span>
      );
    }
    return (
      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-500">
        — Missing in Document
      </span>
    );
  };

  const handleSaveVerifiedQuote = async () => {
    if (!quoteTitle.trim()) {
      alert('Quotation title is required.');
      return;
    }

    const amountFloat = parseFloat(amountRupees || '0');
    if (isNaN(amountFloat) || amountFloat < 0) {
      alert('Please enter a valid quotation amount in INR.');
      return;
    }

    const amountPaise = Math.round(amountFloat * 100);

    setSaving(true);
    setError(null);

    try {
      let targetVendorId = selectedVendorId;

      // 1. Create vendor if user opted for NEW
      if (vendorMode === 'NEW') {
        if (!newVendorName.trim()) {
          alert('New vendor name is required.');
          setSaving(false);
          return;
        }

        const vRes = await fetch(`/api/events/${eventId}/vendors`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newVendorName.trim(),
            category: newVendorCategory,
            city: 'Ahmedabad',
          }),
        });

        const vJson = await vRes.json();
        if (!vJson.success) {
          throw new Error(vJson.error || 'Failed to create vendor record.');
        }
        targetVendorId = vJson.data.id;
      }

      if (!targetVendorId) {
        alert('Please select or specify a vendor.');
        setSaving(false);
        return;
      }

      // 2. Create the verified quotation record
      const inclusions = inclusionsText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      const exclusions = exclusionsText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      const qRes = await fetch(`/api/events/${eventId}/quotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId: targetVendorId,
          quoteTitle,
          quotedAmountPaise: amountPaise,
          currency,
          quoteDate,
          validUntilDate: validUntilDate || null,
          inclusions,
          exclusions,
          cancellationPolicy: cancellationPolicy || null,
          notes: notes || null,
          sourceDocumentName: candidate.sourceDocumentName,
          isExtractedByAi: true,
        }),
      });

      const qJson = await qRes.json();
      if (!qJson.success) {
        throw new Error(qJson.error || 'Failed to save verified quotation.');
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error saving quotation.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div ref={dialogRef} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="review-modal-title">
      <div className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white rounded-t-3xl border-b border-amber-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <div className="flex items-center gap-2">
              <h2 id="review-modal-title" className="text-lg font-bold text-slate-900">
                Review Extracted Quotation
              </h2>
              <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                candidate.extractionEngine === 'gemini'
                  ? 'bg-[#e8efe5] text-[#285942]'
                  : 'bg-slate-100 text-slate-700'
              }`}>
                {candidate.extractionEngine === 'gemini' ? '✨ Gemini GenAI' : '📄 Heuristic Parser'}
              </span>
              <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900">
                Confidence: {candidate.confidence}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Source file: <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">{candidate.sourceDocumentName}</code>.
              Review candidate fields before confirming.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            aria-label="Close review dialog"
          >
            ✕
          </button>
        </div>

        {error && (
          <div role="alert" className="mx-6 mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-800">
            {error}
          </div>
        )}

        <div className="p-6 space-y-5">
          {/* Vendor Assignment */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <span>Vendor Assignment</span>
                {renderProvenanceBadge(candidate.vendorName.status)}
              </label>
              <div className="flex items-center gap-3 text-xs">
                {vendors.length > 0 && (
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="vendorMode"
                      checked={vendorMode === 'EXISTING'}
                      onChange={() => setVendorMode('EXISTING')}
                      className="text-[#285942]"
                    />
                    <span>Existing Vendor</span>
                  </label>
                )}
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="vendorMode"
                    checked={vendorMode === 'NEW'}
                    onChange={() => setVendorMode('NEW')}
                    className="text-[#285942]"
                  />
                  <span>Create New Vendor</span>
                </label>
              </div>
            </div>

            {vendorMode === 'EXISTING' ? (
              <select
                aria-label="Existing vendor"
                value={selectedVendorId}
                onChange={(e) => setSelectedVendorId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#285942]"
              >
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.category})
                  </option>
                ))}
              </select>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <input
                    aria-label="New vendor name"
                    type="text"
                    value={newVendorName}
                    onChange={(e) => setNewVendorName(e.target.value)}
                    placeholder="New vendor name"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#285942]"
                  />
                </div>
                <div>
                  <select
                    aria-label="New vendor category"
                    value={newVendorCategory}
                    onChange={(e) => setNewVendorCategory(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#285942]"
                  >
                    {VENDOR_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Core Quote Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">Quotation Title *</label>
                {renderProvenanceBadge(candidate.quoteTitle.status)}
              </div>
              <input
                aria-label="Quotation title"
                type="text"
                value={quoteTitle}
                onChange={(e) => setQuoteTitle(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#285942]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">Quoted Amount (₹ INR) *</label>
                {renderProvenanceBadge(candidate.quotedAmountPaise.status)}
              </div>
              <input
                aria-label="Quoted amount in rupees"
                type="number"
                min="0"
                step="1"
                value={amountRupees}
                onChange={(e) => setAmountRupees(e.target.value)}
                placeholder="Amount in Rupees"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#285942]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">Quote Date</label>
                {renderProvenanceBadge(candidate.quoteDate.status)}
              </div>
              <input
                aria-label="Quote date"
                type="date"
                value={quoteDate}
                onChange={(e) => setQuoteDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#285942]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">Valid Until</label>
                {renderProvenanceBadge(candidate.validUntilDate.status)}
              </div>
              <input
                aria-label="Valid until date"
                type="date"
                value={validUntilDate}
                onChange={(e) => setValidUntilDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#285942]"
              />
            </div>
          </div>

          {/* Scope Inclusions and Exclusions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-emerald-800">Inclusions (one per line)</label>
                {renderProvenanceBadge(candidate.inclusions.status)}
              </div>
              <textarea
                aria-label="Inclusions, one per line"
                rows={3}
                value={inclusionsText}
                onChange={(e) => setInclusionsText(e.target.value)}
                placeholder="e.g. Buffet service&#10;Cutlery & Crockery&#10;Welcome drinks"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#285942]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-red-800">Exclusions (one per line)</label>
                {renderProvenanceBadge(candidate.exclusions.status)}
              </div>
              <textarea
                aria-label="Exclusions, one per line"
                rows={3}
                value={exclusionsText}
                onChange={(e) => setExclusionsText(e.target.value)}
                placeholder="e.g. Taxes not included&#10;Late night staff surcharge"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#285942]"
              />
            </div>
          </div>

          {/* Cancellation & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">Cancellation Policy</label>
                {renderProvenanceBadge(candidate.cancellationPolicy.status)}
              </div>
              <input
                aria-label="Cancellation policy"
                type="text"
                value={cancellationPolicy}
                onChange={(e) => setCancellationPolicy(e.target.value)}
                placeholder="e.g. 50% refund up to 14 days before event"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#285942]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">Notes & Caveats</label>
                {renderProvenanceBadge(candidate.notes.status)}
              </div>
              <input
                aria-label="Notes and caveats"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Special clauses or vendor notes"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#285942]"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between rounded-b-3xl">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveVerifiedQuote}
            disabled={saving}
            className="rounded-xl bg-[#285942] px-5 py-2.5 text-xs font-bold text-white shadow hover:bg-[#1e4734] disabled:opacity-50 flex items-center gap-1.5"
          >
            <span>💾</span>
            <span>{saving ? 'Saving...' : 'Save as Verified Quotation'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
