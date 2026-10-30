'use client';

import { useState } from 'react';
import { EventDetail } from '@/lib/services/eventService';
import { ImpactPreviewResult } from '@/lib/domain/impact/schemas';
import { formatINR } from '@/lib/domain/formatting';
import EventHistoryTimeline from './EventHistoryTimeline';

interface ChangeImpactViewProps {
  eventDetail: EventDetail;
  onApplied: () => void;
}

export default function ChangeImpactView({ eventDetail, onApplied }: ChangeImpactViewProps) {
  const { event, budget } = eventDetail;

  // Form State
  const [targetGuestCount, setTargetGuestCount] = useState<number>(event.targetGuestCount);
  const [startDate, setStartDate] = useState<string>(event.startDate);
  const [endDate, setEndDate] = useState<string>(event.endDate || '');
  const [totalBudgetRupees, setTotalBudgetRupees] = useState<number>(
    Math.round(budget.totalBudgetPaise / 100)
  );
  const [venueCity, setVenueCity] = useState<string>(event.venueCity);
  const [venueName, setVenueName] = useState<string>(event.venueName || '');

  // Preview & Confirm State
  const [preview, setPreview] = useState<ImpactPreviewResult | null>(null);
  const [selectedActionIds, setSelectedActionIds] = useState<string[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [applying, setApplying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);

  // Quick increment helpers
  const adjustGuests = (delta: number) => {
    setTargetGuestCount((prev) => Math.max(1, prev + delta));
  };

  const handleGeneratePreview = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setConflictMessage(null);
    setLoadingPreview(true);

    try {
      const res = await fetch(`/api/events/${event.id}/change-impact/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          changeType: 'MULTI_FIELD',
          proposedChanges: {
            targetGuestCount,
            startDate,
            endDate: endDate || null,
            totalBudgetRupees,
            venueCity,
            venueName: venueName || null,
          },
        }),
      });

      const json = await res.json();
      if (json.success && json.preview) {
        setPreview(json.preview);
        // By default, pre-select all calculated side-effect actions for convenience
        const autoActionIds = json.preview.findings
          .filter(
            (f: { automaticChangeAllowed: boolean; proposedAction?: { id: string } | null }) =>
              f.automaticChangeAllowed && f.proposedAction
          )
          .map((f: { proposedAction: { id: string } }) => f.proposedAction.id);
        setSelectedActionIds(autoActionIds);
      } else {
        setErrorMessage(json.error || 'Failed to generate impact preview.');
      }
    } catch {
      setErrorMessage('Network error while generating change impact preview.');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleToggleAction = (actionId: string) => {
    setSelectedActionIds((prev) =>
      prev.includes(actionId) ? prev.filter((id) => id !== actionId) : [...prev, actionId]
    );
  };

  const handleConfirmChanges = async () => {
    if (!preview) return;
    setApplying(true);
    setErrorMessage(null);
    setConflictMessage(null);

    try {
      const res = await fetch(`/api/events/${event.id}/change-impact/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          previewId: preview.previewId,
          sourceVersion: preview.sourceVersion,
          changeType: preview.changeType,
          proposedChanges: {
            targetGuestCount,
            startDate,
            endDate: endDate || null,
            totalBudgetRupees,
            venueCity,
            venueName: venueName || null,
          },
          approvedActionIds: selectedActionIds,
        }),
      });

      const json = await res.json();
      if (res.status === 409) {
        setConflictMessage(
          json.error ||
            'Conflict detected: The event workspace was updated by another action since this preview was generated. Please refresh and preview again.'
        );
        return;
      }

      if (json.success) {
        setPreview(null);
        onApplied();
      } else {
        setErrorMessage(json.error || 'Failed to apply authorized changes.');
      }
    } catch {
      setErrorMessage('Network error while applying authorized changes.');
    } finally {
      setApplying(false);
    }
  };

  const handleCancelPreview = () => {
    setPreview(null);
    setSelectedActionIds([]);
    setErrorMessage(null);
    setConflictMessage(null);
    // Reset to current event state
    setTargetGuestCount(event.targetGuestCount);
    setStartDate(event.startDate);
    setEndDate(event.endDate || '');
    setTotalBudgetRupees(Math.round(budget.totalBudgetPaise / 100));
    setVenueCity(event.venueCity);
    setVenueName(event.venueName || '');
  };

  const hasFormChanges =
    targetGuestCount !== event.targetGuestCount ||
    startDate !== event.startDate ||
    (endDate || null) !== (event.endDate || null) ||
    totalBudgetRupees !== Math.round(budget.totalBudgetPaise / 100) ||
    venueCity !== event.venueCity ||
    (venueName || null) !== (event.venueName || null);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Overview Card */}
      <div className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50/60 via-[#e8efe5]/40 to-white p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#e8efe5] px-3 py-1 text-xs font-bold text-[#285942] mb-2">
              <span>Plan with confidence</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Change the plan, see what follows.
            </h2>
            <p className="mt-1 text-sm text-slate-600 max-w-2xl">
              Adjust guest count, dates, or budget. Gatherly&apos;s change engine previews ripple-effect
              consequences across catering, milestones, and budget ceilings{' '}
              <strong>before</strong> anything is saved.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-mono text-slate-500 shadow-sm">
            <span>Version:</span>
            <strong className="text-slate-800">v{event.version ?? 1}</strong>
          </div>
        </div>

        {/* Inputs Form */}
        <form onSubmit={handleGeneratePreview} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Guest Count Input */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <label className="block text-xs font-bold text-slate-600 mb-1">
                👥 Target Guest Count
              </label>
              <div className="flex items-center gap-2 mt-2">
                <input
                  aria-label="Target guest count"
                  type="number"
                  min="1"
                  max="50000"
                  value={targetGuestCount}
                  onChange={(e) => setTargetGuestCount(parseInt(e.target.value) || 0)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-base font-bold text-slate-900 focus:border-[#285942] focus:outline-none"
                />
              </div>
              <div className="mt-2.5 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => adjustGuests(-50)}
                  className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                >
                  -50
                </button>
                <button
                  type="button"
                  onClick={() => adjustGuests(-25)}
                  className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                >
                  -25
                </button>
                <button
                  type="button"
                  onClick={() => adjustGuests(25)}
                  className="rounded-lg bg-[#e8efe5] px-2 py-1 text-xs font-bold text-[#285942] hover:bg-[#d1e3d1]"
                >
                  +25
                </button>
                <button
                  type="button"
                  onClick={() => adjustGuests(50)}
                  className="rounded-lg bg-[#e8efe5] px-2 py-1 text-xs font-bold text-[#285942] hover:bg-[#d1e3d1]"
                >
                  +50
                </button>
              </div>
            </div>

            {/* Total Budget Input */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <label className="block text-xs font-bold text-slate-600 mb-1">
                💰 Total Budget (INR ₹)
              </label>
              <input
                aria-label="Total budget in rupees"
                type="number"
                min="1000"
                step="10000"
                value={totalBudgetRupees}
                onChange={(e) => setTotalBudgetRupees(parseInt(e.target.value) || 0)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-base font-bold text-slate-900 focus:border-[#285942] focus:outline-none"
              />
              <span className="mt-2 block text-xs font-semibold text-[#285942]">
                {formatINR(totalBudgetRupees * 100)} ceiling
              </span>
            </div>

            {/* Start Date Input */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <label className="block text-xs font-bold text-slate-600 mb-1">
                📅 Event Start Date
              </label>
              <input
                aria-label="Event start date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900 focus:border-[#285942] focus:outline-none"
              />
              <span className="mt-2 block text-xs text-slate-500">
                Current: {event.startDate}
              </span>
            </div>

            {/* End Date Input */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <label className="block text-xs font-bold text-slate-600 mb-1">
                📅 End Date (Optional Multi-Day)
              </label>
              <input
                aria-label="Event end date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900 focus:border-[#285942] focus:outline-none"
              />
              <span className="mt-2 block text-xs text-slate-500">
                Current: {event.endDate || 'Single-day event'}
              </span>
            </div>

            {/* Venue City Input */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <label className="block text-xs font-bold text-slate-600 mb-1">
                📍 Host City
              </label>
              <input
                aria-label="Host city"
                type="text"
                value={venueCity}
                onChange={(e) => setVenueCity(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900 focus:border-[#285942] focus:outline-none"
              />
              <span className="mt-2 block text-xs text-slate-500">Current: {event.venueCity}</span>
            </div>

            {/* Venue Name Input */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <label className="block text-xs font-bold text-slate-600 mb-1">
                🏛️ Venue Name
              </label>
              <input
                aria-label="Venue name"
                type="text"
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
                placeholder="e.g. The Grand Bhagwati"
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900 focus:border-[#285942] focus:outline-none"
              />
              <span className="mt-2 block text-xs text-slate-500">
                Current: {event.venueName || 'None selected'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={loadingPreview || !hasFormChanges}
              className={`rounded-2xl px-6 py-3 text-sm font-black transition-all shadow-md ${
                !hasFormChanges
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  : 'bg-[#285942] text-white hover:bg-[#1e4734] hover:shadow-[#c5d8c6]'
              }`}
            >
              {loadingPreview ? '⏳ Computing Impact...' : '🔍 Preview Change Consequences'}
            </button>

            {hasFormChanges && !preview && (
              <button
                type="button"
                onClick={handleCancelPreview}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                Reset to Original
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Error or Conflict Feedback */}
      {errorMessage && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">
          ⚠️ {errorMessage}
        </div>
      )}

      {conflictMessage && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-900 shadow-sm animate-pulse">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h4 className="font-bold text-base">Stale Preview Conflict Detected</h4>
              <p className="mt-1 text-sm text-amber-800">{conflictMessage}</p>
              <button
                onClick={handleGeneratePreview}
                className="mt-3 rounded-xl bg-amber-800 px-4 py-2 text-xs font-bold text-white hover:bg-amber-900"
              >
                ↻ Re-evaluate Impact on Fresh State
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Panel Section */}
      {preview && (
        <div className="rounded-3xl border-2 border-[#b8cbb6] bg-white p-6 sm:p-8 shadow-lg animate-fade-in space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <span className="rounded-full bg-[#e8efe5] px-3 py-0.5 text-xs font-black text-[#263b34]">
                STAGE 1: PREVIEW READY (NOT YET SAVED)
              </span>
              <h3 className="mt-1.5 text-xl font-black text-slate-900">
                Explainable Impact Analysis Findings
              </h3>
              <p className="text-xs text-slate-500">
                No database changes have occurred. Review calculated adjustments and warnings below.
              </p>
            </div>

            {/* Summary Counters */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700">
                Findings: {preview.summary.totalFindings}
              </span>
              <span className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">
                ⚙️ Calculated: {preview.summary.calculatedCount}
              </span>
              <span className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800">
                ⚠️ Review: {preview.summary.reviewCount}
              </span>
              {preview.summary.criticalCount > 0 && (
                <span className="rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-800">
                  🛑 Critical: {preview.summary.criticalCount}
                </span>
              )}
            </div>
          </div>

          {/* Side-by-Side Diff Snapshot */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-2xl bg-slate-50 p-4 border border-slate-200 text-xs">
            <div>
              <span className="font-bold text-slate-400 uppercase tracking-wider text-xs">
                Current Stored State
              </span>
              <ul className="mt-2 space-y-1 text-slate-700">
                <li>
                  <strong>Guests:</strong> {preview.currentValues.targetGuestCount}
                </li>
                <li>
                  <strong>Start Date:</strong> {preview.currentValues.startDate}
                </li>
                <li>
                  <strong>End Date:</strong> {preview.currentValues.endDate || 'None'}
                </li>
                <li>
                  <strong>Budget Ceiling:</strong> {formatINR(preview.currentValues.totalBudgetPaise)}
                </li>
                <li>
                  <strong>Location:</strong> {preview.currentValues.venueCity}
                </li>
              </ul>
            </div>

            <div>
              <span className="font-bold text-[#285942] uppercase tracking-wider text-xs">
                Proposed Requirements
              </span>
              <ul className="mt-2 space-y-1 text-slate-900 font-semibold">
                <li
                  className={
                    preview.proposedValues.targetGuestCount !==
                    preview.currentValues.targetGuestCount
                      ? 'text-[#285942] font-bold'
                      : ''
                  }
                >
                  <strong>Guests:</strong> {preview.proposedValues.targetGuestCount}
                </li>
                <li
                  className={
                    preview.proposedValues.startDate !== preview.currentValues.startDate
                      ? 'text-[#285942] font-bold'
                      : ''
                  }
                >
                  <strong>Start Date:</strong> {preview.proposedValues.startDate}
                </li>
                <li
                  className={
                    preview.proposedValues.endDate !== preview.currentValues.endDate
                      ? 'text-[#285942] font-bold'
                      : ''
                  }
                >
                  <strong>End Date:</strong> {preview.proposedValues.endDate || 'None'}
                </li>
                <li
                  className={
                    preview.proposedValues.totalBudgetPaise !==
                    preview.currentValues.totalBudgetPaise
                      ? 'text-[#285942] font-bold'
                      : ''
                  }
                >
                  <strong>Budget Ceiling:</strong>{' '}
                  {formatINR(preview.proposedValues.totalBudgetPaise)}
                </li>
                <li
                  className={
                    preview.proposedValues.venueCity !== preview.currentValues.venueCity
                      ? 'text-[#285942] font-bold'
                      : ''
                  }
                >
                  <strong>Location:</strong> {preview.proposedValues.venueCity}
                </li>
              </ul>
            </div>
          </div>

          {/* Categorized Findings */}
          <div className="space-y-4">
            {preview.findings.map((finding) => {
              const isCalculated = finding.classification === 'CALCULATED_CHANGE';
              const isCritical =
                finding.severity === 'CRITICAL' ||
                finding.classification === 'CONSTRAINT_VIOLATION';
              const hasAction = finding.proposedAction !== null && finding.proposedAction !== undefined;
              const isChecked = hasAction && selectedActionIds.includes(finding.proposedAction!.id);

              return (
                <div
                  key={finding.id}
                  className={`rounded-2xl border p-5 transition-all ${
                    isCritical
                      ? 'border-red-300 bg-red-50/70'
                      : isCalculated
                      ? 'border-emerald-300 bg-emerald-50/40'
                      : 'border-amber-200 bg-amber-50/30'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-black uppercase ${
                            isCritical
                              ? 'bg-red-200 text-red-900'
                              : isCalculated
                              ? 'bg-emerald-200 text-emerald-900'
                              : 'bg-amber-200 text-amber-900'
                          }`}
                        >
                          {finding.classification.replace('_', ' ')}
                        </span>
                        <span className="text-xs font-mono text-slate-400">
                          [{finding.ruleId}]
                        </span>
                      </div>

                      <h4 className="text-base font-bold text-slate-900">{finding.title}</h4>
                      <p className="text-xs text-slate-700 leading-relaxed">{finding.reason}</p>

                      <div className="pt-1 text-xs text-slate-500">
                        <strong>Required Action:</strong> {finding.requiredUserAction}
                      </div>
                    </div>

                    {/* Opt-in side-effect checkbox for calculated changes */}
                    {hasAction && (
                      <div className="rounded-xl border border-emerald-300 bg-white p-3 self-start shadow-sm min-w-[200px]">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleAction(finding.proposedAction!.id)}
                            className="h-4 w-4 rounded text-[#285942] focus:ring-[#285942]"
                          />
                          <span className="text-xs font-bold text-emerald-900">
                            Apply this update
                          </span>
                        </label>
                        <span className="mt-1 block text-xs text-slate-500">
                          {finding.proposedAction!.rationale}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-6">
            <div className="text-xs text-slate-500">
              {selectedActionIds.length > 0
                ? `Ready to apply primary change + ${selectedActionIds.length} approved side-effect adjustment(s).`
                : 'Ready to apply primary requirement change only (no side-effects authorized).'}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleCancelPreview}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={applying}
                onClick={handleConfirmChanges}
                className="rounded-2xl bg-[#285942] px-6 py-2.5 text-sm font-black text-white hover:bg-[#1e4734] shadow-md shadow-[#c5d8c6] disabled:opacity-50"
              >
                {applying ? '⏳ Applying Atomically...' : '✓ Confirm & Persist Requirements'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Historical Audit Log */}
      <EventHistoryTimeline eventId={event.id} />
    </div>
  );
}
