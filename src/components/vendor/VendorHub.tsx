'use client';

import { useState, useEffect } from 'react';
import { formatINR } from '@/lib/domain/formatting';
import QuoteComparisonView from './QuoteComparisonView';

interface Vendor {
  id: string;
  eventId: string;
  name: string;
  category: string;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  website: string | null;
  city: string | null;
  notes: string | null;
  verificationStatus: string;
}

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

interface BudgetCategory {
  id: string;
  name: string;
  allocatedPaise: number;
}

interface VendorHubProps {
  eventId: string;
  categories: BudgetCategory[];
}

const VENDOR_CATEGORIES = [
  'VENUE', 'CATERING', 'DECOR', 'PHOTOGRAPHY',
  'ENTERTAINMENT', 'TRANSPORTATION', 'INVITATIONS', 'GENERAL'
];

const CATEGORY_EMOJIS: Record<string, string> = {
  VENUE: '🏛️',
  CATERING: '🍽️',
  DECOR: '🌸',
  PHOTOGRAPHY: '📸',
  ENTERTAINMENT: '🎵',
  TRANSPORTATION: '🚗',
  INVITATIONS: '✉️',
  GENERAL: '📦',
};

const STATUS_COLORS: Record<string, string> = {
  RECEIVED: 'bg-slate-100 text-slate-700',
  SHORTLISTED: 'bg-blue-100 text-blue-800',
  ACCEPTED: 'bg-emerald-100 text-emerald-800',
  REJECTED: 'bg-red-100 text-red-700',
  SUPERSEDED: 'bg-amber-100 text-amber-700',
};

export default function VendorHub({ eventId, categories }: VendorHubProps) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [quotes, setQuotes] = useState<VendorQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedVendorId, setExpandedVendorId] = useState<string | null>(null);
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [addingQuoteForVendor, setAddingQuoteForVendor] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [comparisonVendor, setComparisonVendor] = useState<Vendor | null>(null);

  const [vendorForm, setVendorForm] = useState({
    name: '',
    category: 'GENERAL',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    city: '',
    notes: '',
  });

  const [quoteForm, setQuoteForm] = useState({
    quoteTitle: '',
    quotedAmountRupees: '',
    quoteDate: '',
    inclusions: '',
    exclusions: '',
    cancellationPolicy: '',
    notes: '',
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchData = async () => {
    try {
      const [vRes, qRes] = await Promise.all([
        fetch(`/api/events/${eventId}/vendors`),
        fetch(`/api/events/${eventId}/quotes`),
      ]);
      const [vJson, qJson] = await Promise.all([vRes.json(), qRes.json()]);

      if (vJson.success) setVendors(vJson.data);
      if (qJson.success) setQuotes(qJson.data);
    } catch {
      setError('Failed to load vendor data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const [vRes, qRes] = await Promise.all([
          fetch(`/api/events/${eventId}/vendors`),
          fetch(`/api/events/${eventId}/quotes`),
        ]);
        const [vJson, qJson] = await Promise.all([vRes.json(), qRes.json()]);

        if (ignore) return;
        if (vJson.success) setVendors(vJson.data);
        if (qJson.success) setQuotes(qJson.data);
      } catch {
        if (!ignore) setError('Failed to load vendor data.');
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, [eventId]);

  const handleAddVendor = async () => {
    if (!vendorForm.name.trim()) {
      alert('Vendor name is required.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/events/${eventId}/vendors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: vendorForm.name,
          category: vendorForm.category,
          contactName: vendorForm.contactName || null,
          contactPhone: vendorForm.contactPhone || null,
          contactEmail: vendorForm.contactEmail || null,
          city: vendorForm.city || null,
          notes: vendorForm.notes || null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchData();
        setShowAddVendor(false);
        setVendorForm({ name: '', category: 'GENERAL', contactName: '', contactPhone: '', contactEmail: '', city: '', notes: '' });
        showToast('Vendor added!');
      } else {
        alert(json.error || 'Failed to add vendor.');
      }
    } catch {
      alert('Error adding vendor.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteVendor = async (vendorId: string) => {
    if (!confirm('Delete this vendor and all their quotes?')) return;
    try {
      const res = await fetch(`/api/events/${eventId}/vendors/${vendorId}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        await fetchData();
        showToast('Vendor deleted.');
      } else {
        alert(json.error || 'Failed to delete vendor.');
      }
    } catch {
      alert('Error deleting vendor.');
    }
  };

  const handleAddQuote = async (vendorId: string) => {
    if (!quoteForm.quoteTitle.trim() || !quoteForm.quoteDate) {
      alert('Quote title and date are required.');
      return;
    }
    const amountPaise = Math.round(parseFloat(quoteForm.quotedAmountRupees || '0') * 100);
    if (amountPaise < 0 || !Number.isInteger(amountPaise)) {
      alert('Invalid quote amount.');
      return;
    }
    setSaving(true);
    try {
      const inclusions = quoteForm.inclusions
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      const exclusions = quoteForm.exclusions
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch(`/api/events/${eventId}/quotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId,
          quoteTitle: quoteForm.quoteTitle,
          quotedAmountPaise: amountPaise,
          quoteDate: quoteForm.quoteDate,
          inclusions,
          exclusions,
          cancellationPolicy: quoteForm.cancellationPolicy || null,
          notes: quoteForm.notes || null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchData();
        setAddingQuoteForVendor(null);
        setQuoteForm({ quoteTitle: '', quotedAmountRupees: '', quoteDate: '', inclusions: '', exclusions: '', cancellationPolicy: '', notes: '' });
        showToast('Quote added!');
      } else {
        alert(json.error || 'Failed to add quote.');
      }
    } catch {
      alert('Error adding quote.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 animate-pulse rounded-lg bg-amber-100 w-48" />
        <div className="h-64 animate-pulse rounded-2xl bg-amber-50/50" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
        <p className="font-bold">Error loading vendors</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  // Group vendors by category
  const byCategory = new Map<string, Vendor[]>();
  for (const vendor of vendors) {
    const existing = byCategory.get(vendor.category) ?? [];
    existing.push(vendor);
    byCategory.set(vendor.category, existing);
  }

  const getVendorQuotes = (vendorId: string) =>
    quotes.filter((q) => q.vendorId === vendorId);

  const vendorQuoteSummary = (vendorId: string) => {
    const vq = getVendorQuotes(vendorId);
    if (vq.length === 0) return null;
    const amounts = vq.map((q) => q.quotedAmountPaise);
    return {
      count: vq.length,
      min: Math.min(...amounts),
      max: Math.max(...amounts),
    };
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-xl">
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Quote Comparison Modal */}
      {comparisonVendor && (
        <QuoteComparisonView
          quotes={getVendorQuotes(comparisonVendor.id)}
          vendorName={comparisonVendor.name}
          eventId={eventId}
          categories={categories}
          onConfirmed={() => {
            fetchData();
            showToast('Quote confirmed!');
          }}
          onClose={() => setComparisonVendor(null)}
        />
      )}

      <div className="rounded-3xl border border-amber-200/80 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5 border-b border-amber-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Vendor Hub</h2>
            <p className="text-xs text-slate-500">{vendors.length} vendors • {quotes.length} quotes</p>
          </div>
          <button
            onClick={() => setShowAddVendor(true)}
            className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white hover:bg-orange-500"
          >
            + Add Vendor
          </button>
        </div>

        {/* Add Vendor Form */}
        {showAddVendor && (
          <div className="mb-6 rounded-2xl border border-orange-200 bg-orange-50/40 p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-800">New Vendor</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={vendorForm.name}
                  onChange={(e) => setVendorForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Vendor / company name"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                <select
                  value={vendorForm.category}
                  onChange={(e) => setVendorForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {VENDOR_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Contact Name</label>
                <input
                  type="text"
                  value={vendorForm.contactName}
                  onChange={(e) => setVendorForm((f) => ({ ...f, contactName: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Phone</label>
                <input
                  type="text"
                  value={vendorForm.contactPhone}
                  onChange={(e) => setVendorForm((f) => ({ ...f, contactPhone: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={vendorForm.contactEmail}
                  onChange={(e) => setVendorForm((f) => ({ ...f, contactEmail: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">City</label>
                <input
                  type="text"
                  value={vendorForm.city}
                  onChange={(e) => setVendorForm((f) => ({ ...f, city: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={vendorForm.notes}
                  onChange={(e) => setVendorForm((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleAddVendor}
                disabled={saving}
                className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-bold text-white hover:bg-orange-500 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Add Vendor'}
              </button>
              <button
                onClick={() => setShowAddVendor(false)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {vendors.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/40 p-12 text-center">
            <div className="text-4xl mb-3">🏪</div>
            <p className="font-bold text-slate-700">No vendors yet</p>
            <p className="text-sm text-slate-500 mt-1">Add vendors to compare quotes and manage commitments.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {VENDOR_CATEGORIES.filter((cat) => byCategory.has(cat)).map((cat) => (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">{CATEGORY_EMOJIS[cat] ?? '📦'}</span>
                  <span className="font-bold text-slate-800 text-sm">{cat}</span>
                  <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-bold text-orange-800">
                    {byCategory.get(cat)?.length ?? 0}
                  </span>
                </div>

                <div className="space-y-3 pl-6">
                  {(byCategory.get(cat) ?? []).map((vendor) => {
                    const summary = vendorQuoteSummary(vendor.id);
                    const vendorQuotes = getVendorQuotes(vendor.id);
                    const isExpanded = expandedVendorId === vendor.id;

                    return (
                      <div
                        key={vendor.id}
                        className="rounded-2xl border border-slate-200 bg-white overflow-hidden"
                      >
                        {/* Vendor Card Header */}
                        <div
                          className="flex items-center justify-between p-4 cursor-pointer hover:bg-amber-50/30"
                          onClick={() => setExpandedVendorId(isExpanded ? null : vendor.id)}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-sm">{vendor.name}</span>
                              {vendor.city && (
                                <span className="text-xs text-slate-500">📍 {vendor.city}</span>
                              )}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                              {vendor.contactName && <span>👤 {vendor.contactName}</span>}
                              {vendor.contactPhone && <span>📞 {vendor.contactPhone}</span>}
                              {summary ? (
                                <span className="font-semibold text-orange-700">
                                  {summary.count} quote{summary.count > 1 ? 's' : ''} •{' '}
                                  {formatINR(summary.min)}
                                  {summary.count > 1 ? ` – ${formatINR(summary.max)}` : ''}
                                </span>
                              ) : (
                                <span className="text-slate-400">No quotes</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {vendorQuotes.length >= 2 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setComparisonVendor(vendor);
                                }}
                                className="rounded-xl border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-800 hover:bg-blue-100"
                              >
                                Compare Quotes
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteVendor(vendor.id);
                              }}
                              className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700 hover:bg-red-100"
                            >
                              Delete
                            </button>
                            <span className="text-slate-400">{isExpanded ? '▲' : '▼'}</span>
                          </div>
                        </div>

                        {/* Expanded Section */}
                        {isExpanded && (
                          <div className="border-t border-amber-100 p-4 space-y-4 bg-amber-50/20">
                            {/* Quotes list */}
                            {vendorQuotes.length === 0 ? (
                              <p className="text-sm text-slate-500">No quotes yet.</p>
                            ) : (
                              <div className="space-y-2">
                                {vendorQuotes.map((q) => (
                                  <div
                                    key={q.id}
                                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3"
                                  >
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm text-slate-900">{q.quoteTitle}</span>
                                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${STATUS_COLORS[q.status] ?? 'bg-slate-100 text-slate-700'}`}>
                                          {q.status}
                                        </span>
                                        {q.confirmedCommitment && (
                                          <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                                            ✓ Confirmed
                                          </span>
                                        )}
                                      </div>
                                      <div className="mt-0.5 flex items-center gap-3 text-xs text-slate-500">
                                        <span className="font-bold text-orange-900">{formatINR(q.quotedAmountPaise)}</span>
                                        <span>{q.quoteDate}</span>
                                        {q.inclusionsJson && (
                                          <span>
                                            {JSON.parse(q.inclusionsJson || '[]').length} inclusions
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Add Quote Form */}
                            {addingQuoteForVendor === vendor.id ? (
                              <div className="rounded-2xl border border-orange-200 bg-white p-4 space-y-3">
                                <h4 className="text-sm font-bold text-slate-800">Add Quote</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Quote Title *</label>
                                    <input
                                      type="text"
                                      value={quoteForm.quoteTitle}
                                      onChange={(e) => setQuoteForm((f) => ({ ...f, quoteTitle: e.target.value }))}
                                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Amount (₹) *</label>
                                    <input
                                      type="number"
                                      min={0}
                                      value={quoteForm.quotedAmountRupees}
                                      onChange={(e) => setQuoteForm((f) => ({ ...f, quotedAmountRupees: e.target.value }))}
                                      placeholder="0"
                                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Date *</label>
                                    <input
                                      type="date"
                                      value={quoteForm.quoteDate}
                                      onChange={(e) => setQuoteForm((f) => ({ ...f, quoteDate: e.target.value }))}
                                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Cancellation Policy</label>
                                    <input
                                      type="text"
                                      value={quoteForm.cancellationPolicy}
                                      onChange={(e) => setQuoteForm((f) => ({ ...f, cancellationPolicy: e.target.value }))}
                                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Inclusions (one per line)</label>
                                    <textarea
                                      rows={3}
                                      value={quoteForm.inclusions}
                                      onChange={(e) => setQuoteForm((f) => ({ ...f, inclusions: e.target.value }))}
                                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Exclusions (one per line)</label>
                                    <textarea
                                      rows={3}
                                      value={quoteForm.exclusions}
                                      onChange={(e) => setQuoteForm((f) => ({ ...f, exclusions: e.target.value }))}
                                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    />
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleAddQuote(vendor.id)}
                                    disabled={saving}
                                    className="rounded-lg bg-orange-600 px-3 py-2 text-xs font-bold text-white hover:bg-orange-500 disabled:opacity-50"
                                  >
                                    {saving ? 'Saving...' : 'Add Quote'}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setAddingQuoteForVendor(null);
                                      setQuoteForm({ quoteTitle: '', quotedAmountRupees: '', quoteDate: '', inclusions: '', exclusions: '', cancellationPolicy: '', notes: '' });
                                    }}
                                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => setAddingQuoteForVendor(vendor.id)}
                                className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100"
                              >
                                + Add Quote
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

