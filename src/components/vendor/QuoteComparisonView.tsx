'use client';

import { useState } from 'react';
import { formatINR } from '@/lib/domain/formatting';

interface VendorQuote {
  id: string;
  vendorId: string;
  quoteTitle: string;
  quotedAmountPaise: number;
  quoteDate: string;
  validUntilDate: string | null;
  status: string;
  inclusionsJson: string | null;
  exclusionsJson: string | null;
  paymentTermsJson: string | null;
  cancellationPolicy: string | null;
  notes: string | null;
  confirmedCommitment: boolean;
}

interface QuoteComparisonViewProps {
  quotes: VendorQuote[];
  vendorName: string;
  eventId: string;
  categories: Array<{ id: string; name: string; allocatedPaise: number }>;
  onConfirmed: () => void;
  onClose: () => void;
}

const STATUS_BADGE: Record<string, string> = {
  RECEIVED: 'bg-slate-100 text-slate-700',
  SHORTLISTED: 'bg-blue-100 text-blue-800',
  ACCEPTED: 'bg-emerald-100 text-emerald-800',
  REJECTED: 'bg-red-100 text-red-700',
  SUPERSEDED: 'bg-amber-100 text-amber-700',
};

export default function QuoteComparisonView({
  quotes,
  vendorName,
  eventId,
  categories,
  onConfirmed,
  onClose,
}: QuoteComparisonViewProps) {
  const [confirmingQuoteId, setConfirmingQuoteId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [confirmResult, setConfirmResult] = useState<{
    quotedAmountPaise: number;
    currentAllocatedPaise: number;
    categoryName: string;
    quoteId: string;
  } | null>(null);
  const [applying, setApplying] = useState(false);

  const minAmount = Math.min(...quotes.map((q) => q.quotedAmountPaise));

  const parseJson = (json: string | null): string[] => {
    if (!json) return [];
    try {
      return JSON.parse(json);
    } catch {
      return [];
    }
  };

  const handleConfirm = async (quoteId: string) => {
    if (!selectedCategoryId) {
      alert('Please select a budget category.');
      return;
    }
    setApplying(true);
    try {
      const res = await fetch(`/api/events/${eventId}/quotes/${quoteId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId: selectedCategoryId }),
      });
      const json = await res.json();
      if (json.success) {
        const cat = categories.find((c) => c.id === selectedCategoryId);
        setConfirmResult({
          quotedAmountPaise: json.data.quotedAmountPaise,
          currentAllocatedPaise: json.data.currentAllocatedPaise,
          categoryName: cat?.name ?? 'Unknown',
          quoteId,
        });
      } else {
        alert(json.error || 'Failed to confirm quote.');
      }
    } catch {
      alert('Error confirming quote.');
    } finally {
      setApplying(false);
    }
  };

  const handleApplyToBudget = async () => {
    if (!confirmResult) return;
    setApplying(true);
    try {
      const res = await fetch(`/api/events/${eventId}/quotes/${confirmResult.quoteId}/apply-to-budget`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId: selectedCategoryId }),
      });
      const json = await res.json();
      if (json.success) {
        setConfirmResult(null);
        onConfirmed();
        onClose();
      } else {
        alert(json.error || 'Failed to apply to budget.');
      }
    } catch {
      alert('Error applying to budget.');
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="relative max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="sticky top-0 bg-white rounded-t-3xl border-b border-amber-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Quote Comparison</h2>
            <p className="text-xs text-slate-500">{vendorName} — {quotes.length} quotes</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            ✕ Close
          </button>
        </div>

        {/* Budget impact dialog */}
        {confirmResult && (
          <div className="m-6 rounded-2xl border border-orange-300 bg-orange-50 p-5">
            <h3 className="font-bold text-orange-900 mb-2">Budget Impact Preview</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm mb-4">
              <div className="rounded-xl bg-white border border-slate-200 p-3 text-center">
                <p className="text-xs text-slate-500">Quoted Amount</p>
                <p className="font-bold text-slate-900">{formatINR(confirmResult.quotedAmountPaise)}</p>
              </div>
              <div className="rounded-xl bg-white border border-slate-200 p-3 text-center">
                <p className="text-xs text-slate-500">Current Allocation ({confirmResult.categoryName})</p>
                <p className="font-bold text-slate-900">{formatINR(confirmResult.currentAllocatedPaise)}</p>
              </div>
              <div className={`rounded-xl border p-3 text-center ${
                confirmResult.quotedAmountPaise > confirmResult.currentAllocatedPaise
                  ? 'bg-red-50 border-red-200'
                  : 'bg-emerald-50 border-emerald-200'
              }`}>
                <p className="text-xs text-slate-500">Difference</p>
                <p className="font-bold">
                  {confirmResult.quotedAmountPaise > confirmResult.currentAllocatedPaise ? '+' : ''}
                  {formatINR(Math.abs(confirmResult.quotedAmountPaise - confirmResult.currentAllocatedPaise))}
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-600 mb-4">
              This will mark ₹{(confirmResult.quotedAmountPaise / 100).toLocaleString('en-IN')} as committed
              from <strong>{confirmResult.categoryName}</strong>.
              Do you also want to update the budget allocation?
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setConfirmResult(null)}
                className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={onConfirmed}
                className="rounded-xl border border-orange-300 bg-white px-3 py-2 text-xs font-bold text-orange-800 hover:bg-orange-50"
              >
                Confirm Quote Only
              </button>
              <button
                onClick={handleApplyToBudget}
                disabled={applying}
                className="rounded-xl bg-orange-600 px-4 py-2 text-xs font-bold text-white hover:bg-orange-500 disabled:opacity-50"
              >
                {applying ? 'Applying...' : 'Confirm & Update Budget'}
              </button>
            </div>
          </div>
        )}

        {/* Category selector */}
        {!confirmResult && (
          <div className="px-6 pt-4 pb-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">Budget Category for Confirmation</label>
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Select category...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({formatINR(c.allocatedPaise)})</option>
              ))}
            </select>
          </div>
        )}

        {/* Comparison Table */}
        <div className="p-6 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <td className="font-bold text-slate-700 py-2 pr-4 w-32">Field</td>
                {quotes.map((q) => (
                  <th key={q.id} className="text-left font-bold text-slate-800 py-2 px-3 min-w-[200px]">
                    <div className="flex items-center gap-2">
                      <span>{q.quoteTitle}</span>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${STATUS_BADGE[q.status] ?? 'bg-slate-100 text-slate-700'}`}>
                        {q.status}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-100">
              <tr>
                <td className="font-semibold text-slate-600 py-3 pr-4">Amount</td>
                {quotes.map((q) => (
                  <td key={q.id} className="py-3 px-3">
                    <span className={`font-bold text-sm ${q.quotedAmountPaise === minAmount ? 'text-emerald-700' : 'text-slate-900'}`}>
                      {formatINR(q.quotedAmountPaise)}
                      {q.quotedAmountPaise === minAmount && (
                        <span className="ml-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                          Lowest
                        </span>
                      )}
                    </span>
                  </td>
                ))}
              </tr>
              <tr>
                <td className="font-semibold text-slate-600 py-3 pr-4">Date</td>
                {quotes.map((q) => (
                  <td key={q.id} className="py-3 px-3 text-slate-700">{q.quoteDate}</td>
                ))}
              </tr>
              <tr>
                <td className="font-semibold text-slate-600 py-3 pr-4">Valid Until</td>
                {quotes.map((q) => (
                  <td key={q.id} className="py-3 px-3 text-slate-500">{q.validUntilDate ?? '—'}</td>
                ))}
              </tr>
              <tr>
                <td className="font-semibold text-slate-600 py-3 pr-4 align-top">Inclusions</td>
                {quotes.map((q) => {
                  const inc = parseJson(q.inclusionsJson);
                  return (
                    <td key={q.id} className="py-3 px-3 align-top">
                      {inc.length > 0 ? (
                        <ul className="space-y-1">
                          {inc.map((item, i) => <li key={i} className="text-emerald-700">✓ {item}</li>)}
                        </ul>
                      ) : <span className="text-slate-400">None listed</span>}
                    </td>
                  );
                })}
              </tr>
              <tr>
                <td className="font-semibold text-slate-600 py-3 pr-4 align-top">Exclusions</td>
                {quotes.map((q) => {
                  const exc = parseJson(q.exclusionsJson);
                  return (
                    <td key={q.id} className="py-3 px-3 align-top">
                      {exc.length > 0 ? (
                        <ul className="space-y-1">
                          {exc.map((item, i) => <li key={i} className="text-red-600">✗ {item}</li>)}
                        </ul>
                      ) : <span className="text-slate-400">None listed</span>}
                    </td>
                  );
                })}
              </tr>
              <tr>
                <td className="font-semibold text-slate-600 py-3 pr-4 align-top">Cancellation</td>
                {quotes.map((q) => (
                  <td key={q.id} className="py-3 px-3 text-slate-600 align-top">{q.cancellationPolicy ?? '—'}</td>
                ))}
              </tr>
              {!confirmResult && (
                <tr>
                  <td className="py-3 pr-4" />
                  {quotes.map((q) => (
                    <td key={q.id} className="py-3 px-3">
                      <button
                        onClick={() => {
                          setConfirmingQuoteId(q.id);
                          handleConfirm(q.id);
                        }}
                        disabled={applying || !!confirmingQuoteId || q.status === 'ACCEPTED' || !selectedCategoryId}
                        className="rounded-xl bg-orange-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-orange-500 disabled:opacity-40"
                      >
                        {applying && confirmingQuoteId === q.id ? 'Confirming...' : 'Confirm This Quote'}
                      </button>
                    </td>
                  ))}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

