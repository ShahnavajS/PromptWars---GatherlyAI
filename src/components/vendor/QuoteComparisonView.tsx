'use client';

import { useState } from 'react';
import { formatINR } from '@/lib/domain/formatting';
import { useDialogFocus } from './useDialogFocus';

interface VendorQuote {
  id: string;
  vendorId: string;
  quoteTitle: string;
  quotedAmountPaise: number;
  currency?: string;
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

interface PaymentTermsData {
  advancePercentage?: number;
  milestones?: Array<{ description: string; percentage: number }>;
}

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
  const [supersedeOthers, setSupersedeOthers] = useState(false);
  const [confirmResult, setConfirmResult] = useState<{
    quotedAmountPaise: number;
    currentAllocatedPaise: number;
    categoryName: string;
    quoteId: string;
    currency: string;
  } | null>(null);
  const [applying, setApplying] = useState(false);
  const dialogRef = useDialogFocus(onClose);

  // Currency validation
  const currencies = Array.from(new Set(quotes.map((q) => q.currency || 'INR')));
  const isSingleCurrency = currencies.length <= 1;
  const minAmount = isSingleCurrency && quotes.length > 0
    ? Math.min(...quotes.map((q) => q.quotedAmountPaise))
    : null;

  const parseJson = (json: string | null): string[] => {
    if (!json) return [];
    try {
      const parsed = JSON.parse(json);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const parsePaymentTerms = (json: string | null): PaymentTermsData | null => {
    if (!json) return null;
    try {
      return JSON.parse(json);
    } catch {
      return null;
    }
  };

  const formatQuoteAmount = (paise: number, currency = 'INR') => {
    if (currency === 'INR') {
      return formatINR(paise);
    }
    const units = (paise / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${currency} ${units}`;
  };

  const handleConfirm = async (quote: VendorQuote) => {
    if (!selectedCategoryId) {
      alert('Please select a budget category.');
      return;
    }
    setApplying(true);
    try {
      const res = await fetch(`/api/events/${eventId}/quotes/${quote.id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: selectedCategoryId,
          supersedeOthers,
        }),
      });
      const json = await res.json();
      if (json.success) {
        const cat = categories.find((c) => c.id === selectedCategoryId);
        setConfirmResult({
          quotedAmountPaise: json.data.quotedAmountPaise,
          currentAllocatedPaise: json.data.currentAllocatedPaise,
          categoryName: cat?.name ?? 'Unknown',
          quoteId: quote.id,
          currency: quote.currency || 'INR',
        });
      } else {
        alert(json.error || 'Failed to confirm quote.');
      }
    } catch {
      alert('Error confirming quote.');
    } finally {
      setApplying(false);
      setConfirmingQuoteId(null);
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
    <div ref={dialogRef} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="relative max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="sticky top-0 bg-white rounded-t-3xl border-b border-amber-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 id="modal-title" className="text-lg font-bold text-slate-900">Quotation Comparison Matrix</h2>
            <p className="text-xs text-slate-500">{vendorName} • {quotes.length} quotations compared</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            aria-label="Close quote comparison dialog"
          >
            ✕ Close
          </button>
        </div>

        {/* Multi-Currency Warning Banner */}
        {!isSingleCurrency && (
          <div className="mx-6 mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 flex items-center gap-2">
            <span className="text-base" aria-hidden="true">⚠️</span>
            <div>
              <p className="font-bold">Multi-Currency Denominations Detected</p>
              <p className="mt-0.5 text-amber-800">
                Quotations in this set are denominated in different currencies ({currencies.join(', ')}).
                Nominal ranking is disabled because amounts cannot be compared without explicit exchange conversion.
              </p>
            </div>
          </div>
        )}

        {/* Budget impact dialog */}
        {confirmResult && (
          <div className="m-6 rounded-2xl border border-[#b8cbb6] bg-[#e8efe5] p-5">
            <h3 className="font-bold text-[#263b34] mb-2">Budget Impact Preview</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm mb-4">
              <div className="rounded-xl bg-white border border-slate-200 p-3 text-center">
                <p className="text-xs text-slate-500">Quoted Amount</p>
                <p className="font-bold text-slate-900">{formatQuoteAmount(confirmResult.quotedAmountPaise, confirmResult.currency)}</p>
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
                <p className="text-xs text-slate-500">Variance</p>
                <p className="font-bold">
                  {confirmResult.quotedAmountPaise > confirmResult.currentAllocatedPaise ? '+' : ''}
                  {formatINR(Math.abs(confirmResult.quotedAmountPaise - confirmResult.currentAllocatedPaise))}
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-600 mb-4">
              Quotation commitment confirmed. Would you also like to update the allocated budget ceiling for{' '}
              <strong>{confirmResult.categoryName}</strong> to reflect this agreed rate?
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
                className="rounded-xl border border-[#b8cbb6] bg-white px-3 py-2 text-xs font-bold text-[#285942] hover:bg-[#e8efe5]"
              >
                Keep Existing Allocation
              </button>
              <button
                onClick={handleApplyToBudget}
                disabled={applying}
                className="rounded-xl bg-[#285942] px-4 py-2 text-xs font-bold text-white hover:bg-[#1e4734] disabled:opacity-50"
              >
                {applying ? 'Updating...' : 'Update Category Allocation'}
              </button>
            </div>
          </div>
        )}

        {/* Category selector & Confirmation options */}
        {!confirmResult && (
          <div className="px-6 pt-4 pb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <label htmlFor="budgetCategorySelect" className="block text-xs font-bold text-slate-700 mb-1">
                Link to Budget Category
              </label>
              <select
                id="budgetCategorySelect"
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#285942]"
              >
                <option value="">Select category...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({formatINR(c.allocatedPaise)})</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 pt-2 sm:pt-4">
              <input
                id="supersedeCheckbox"
                type="checkbox"
                checked={supersedeOthers}
                onChange={(e) => setSupersedeOthers(e.target.checked)}
                className="h-4 w-4 rounded text-[#285942] focus:ring-[#285942]"
              />
              <label htmlFor="supersedeCheckbox" className="text-xs text-slate-700">
                Supersede other competing quotes for this requirement
              </label>
            </div>
          </div>
        )}

        {/* Comparison Table */}
        <div className="p-6 overflow-x-auto">
          <table className="w-full text-xs" aria-label="Vendor quotations side-by-side comparison table">
            <thead>
              <tr className="border-b border-amber-200">
                <th scope="col" className="text-left font-bold text-slate-700 py-3 pr-4 w-36">Comparison Factor</th>
                {quotes.map((q) => (
                  <th scope="col" key={q.id} className="text-left font-bold text-slate-800 py-3 px-3 min-w-[220px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold">{q.quoteTitle}</span>
                      <span className={`rounded px-1.5 py-0.5 text-xs font-bold ${STATUS_BADGE[q.status] ?? 'bg-slate-100 text-slate-700'}`}>
                        {q.status}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-100">
              <tr>
                <th scope="row" className="text-left font-semibold text-slate-600 py-3 pr-4">Quoted Amount</th>
                {quotes.map((q) => {
                  const isLowest = isSingleCurrency && minAmount !== null && q.quotedAmountPaise === minAmount;
                  return (
                    <td key={q.id} className="py-3 px-3">
                      <div className="flex flex-col gap-0.5">
                        <span className={`font-bold text-sm ${isLowest ? 'text-emerald-700' : 'text-slate-900'}`}>
                          {formatQuoteAmount(q.quotedAmountPaise, q.currency)}
                        </span>
                        {isLowest && (
                          <span
                            className="inline-block rounded-md bg-emerald-100 px-1.5 py-0.5 text-xs font-bold text-emerald-800 self-start"
                            title="Lowest nominal price only. Does not account for scope differences or qualitative vendor merit."
                          >
                            Lowest Price (Scope may differ)
                          </span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
              <tr>
                <th scope="row" className="text-left font-semibold text-slate-600 py-3 pr-4">Quotation Date</th>
                {quotes.map((q) => (
                  <td key={q.id} className="py-3 px-3 text-slate-700">{q.quoteDate}</td>
                ))}
              </tr>
              <tr>
                <th scope="row" className="text-left font-semibold text-slate-600 py-3 pr-4">Validity Period</th>
                {quotes.map((q) => (
                  <td key={q.id} className="py-3 px-3 text-slate-500">
                    {q.validUntilDate ? `Valid until ${q.validUntilDate}` : <span className="text-slate-600">Not specified in quote</span>}
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row" className="text-left font-semibold text-slate-600 py-3 pr-4 align-top">Scope Inclusions</th>
                {quotes.map((q) => {
                  const inc = parseJson(q.inclusionsJson);
                  return (
                    <td key={q.id} className="py-3 px-3 align-top">
                      {inc.length > 0 ? (
                        <ul className="space-y-1">
                          {inc.map((item, i) => (
                            <li key={i} className="text-emerald-800 flex items-start gap-1">
                              <span className="font-bold select-none text-emerald-600" aria-label="Included">[✓ Included]</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-slate-600">None explicitly listed</span>
                      )}
                    </td>
                  );
                })}
              </tr>
              <tr>
                <th scope="row" className="text-left font-semibold text-slate-600 py-3 pr-4 align-top">Scope Exclusions</th>
                {quotes.map((q) => {
                  const exc = parseJson(q.exclusionsJson);
                  return (
                    <td key={q.id} className="py-3 px-3 align-top">
                      {exc.length > 0 ? (
                        <ul className="space-y-1">
                          {exc.map((item, i) => (
                            <li key={i} className="text-red-700 flex items-start gap-1">
                              <span className="font-bold select-none text-red-500" aria-label="Excluded">[✗ Excluded]</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-slate-600">No exclusions stated</span>
                      )}
                    </td>
                  );
                })}
              </tr>
              <tr>
                <th scope="row" className="text-left font-semibold text-slate-600 py-3 pr-4 align-top">Payment Terms</th>
                {quotes.map((q) => {
                  const terms = parsePaymentTerms(q.paymentTermsJson);
                  return (
                    <td key={q.id} className="py-3 px-3 align-top">
                      {terms && (terms.advancePercentage !== undefined || (terms.milestones && terms.milestones.length > 0)) ? (
                        <div className="space-y-1">
                          {terms.advancePercentage !== undefined && (
                            <p><span className="font-semibold">Advance Deposit:</span> {terms.advancePercentage}%</p>
                          )}
                          {terms.milestones && terms.milestones.length > 0 && (
                            <ul className="list-disc list-inside space-y-0.5 text-xs text-slate-600">
                              {terms.milestones.map((m, i) => (
                                <li key={i}>{m.description}: {m.percentage}%</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-600">Not specified in quote</span>
                      )}
                    </td>
                  );
                })}
              </tr>
              <tr>
                <th scope="row" className="text-left font-semibold text-slate-600 py-3 pr-4 align-top">Cancellation Policy</th>
                {quotes.map((q) => (
                  <td key={q.id} className="py-3 px-3 text-slate-600 align-top">
                    {q.cancellationPolicy ?? <span className="text-slate-600">Not specified in quote</span>}
                  </td>
                ))}
              </tr>
              {quotes.some((q) => q.notes) && (
                <tr>
                  <th scope="row" className="text-left font-semibold text-slate-600 py-3 pr-4 align-top">Notes & Caveats</th>
                  {quotes.map((q) => (
                    <td key={q.id} className="py-3 px-3 text-slate-500 align-top">
                      {q.notes || <span className="text-slate-600">—</span>}
                    </td>
                  ))}
                </tr>
              )}
              {!confirmResult && (
                <tr>
                  <td className="py-4 pr-4" />
                  {quotes.map((q) => (
                    <td key={q.id} className="py-4 px-3">
                      <button
                        onClick={() => {
                          setConfirmingQuoteId(q.id);
                          handleConfirm(q);
                        }}
                        disabled={applying || !!confirmingQuoteId || q.status === 'ACCEPTED' || !selectedCategoryId}
                        className="rounded-xl bg-[#285942] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#1e4734] disabled:opacity-40"
                      >
                        {applying && confirmingQuoteId === q.id ? 'Confirming...' : q.status === 'ACCEPTED' ? '✓ Accepted' : 'Confirm This Quote'}
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
