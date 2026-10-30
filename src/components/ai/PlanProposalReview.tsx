'use client';

import { useState } from 'react';
import type { NormalizedPlanSuggestion } from '@/lib/ai/schemas';
import { formatINR, formatCompactINR } from '@/lib/domain/formatting';

interface Props {
  eventId: string;
  suggestionId: string;
  plan: NormalizedPlanSuggestion;
  status: string;
  isFallback: boolean;
  onReviewed: (status: string, message: string) => void;
  onError: (message: string | null) => void;
}

export default function PlanProposalReview({ eventId, suggestionId, plan, status, isFallback, onReviewed, onError }: Props) {
  const [applying, setApplying] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<Record<string, boolean>>({});
  const [selectedTasks, setSelectedTasks] = useState<Record<string, boolean>>({});
  const [selectedAgenda, setSelectedAgenda] = useState<Record<number, boolean>>({});
  const [selectedVendors, setSelectedVendors] = useState<Record<number, boolean>>({});

  async function applyReview(action: 'ACCEPT_ALL' | 'ACCEPT_SELECTED' | 'REJECT_ALL') {
    setApplying(true);
    onError(null);
    try {
      const response = await fetch(`/api/ai/plan/${suggestionId}/review?eventId=${eventId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          selectedCategoryNames: plan.budgetPlan.categories.filter((category) => selectedCategories[category.name] ?? true).map((category) => category.name),
          selectedTaskIds: plan.tasks.filter((task) => selectedTasks[task.id] ?? true).map((task) => task.id),
          selectedAgendaIndices: plan.agendaBlocks.flatMap((_, index) => selectedAgenda[index] ?? true ? [index] : []),
          selectedVendorIndices: plan.vendorRequirements.flatMap((_, index) => selectedVendors[index] ?? true ? [index] : []),
        }),
      });
      const result = await response.json();
      if (!result.success) {
        onError(result.error || 'Failed to apply plan review.');
        return;
      }
      if (action === 'REJECT_ALL') {
        onReviewed('REJECTED', 'AI suggestions dismissed. Your workspace remains unchanged.');
      } else {
        onReviewed(result.data.status,
          `Applied ${result.data.appliedCategoriesCount} budget categories, ${result.data.appliedTasksCount} tasks, ${result.data.appliedAgendaCount} timeline items, and ${result.data.appliedVendorCount} vendor requirements.`);
      }
    } catch {
      onError('Network error while applying review.');
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {applying && <p role="status" className="text-sm text-slate-600">Applying selected suggestions…</p>}
      {/* Staging Notice Banner */}
      <div
        className={`rounded-2xl border p-5 ${
          status === 'ACCEPTED' || status === 'PARTIALLY_ACCEPTED'
            ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
            : status === 'REJECTED'
            ? 'border-slate-300 bg-slate-50 text-slate-800'
            : 'border-[#b8cbb6] bg-gradient-to-r from-[#e8efe5] to-amber-50 text-[#263b34]'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{status === 'ACCEPTED' || status === 'PARTIALLY_ACCEPTED' ? '✓' : '📋'}</span>
            <div>
              <h4 className="font-extrabold text-sm sm:text-base">
                {status === 'ACCEPTED' || status === 'PARTIALLY_ACCEPTED'
                  ? 'Ideas added to your plan'
                  : status === 'REJECTED'
                  ? 'Ideas dismissed'
                  : 'Your ideas are ready to review'}
              </h4>
              <p className="text-xs mt-0.5 opacity-90">
                {status === 'ACCEPTED' || status === 'PARTIALLY_ACCEPTED'
                  ? 'Your selected budget, task, timeline, and vendor ideas are now part of this plan.'
                  : isFallback
                  ? 'These are starter ideas. Review each one before adding it to your plan.'
                  : 'These suggestions were generated with Gemini. Review each one before adding it to your plan.'}
              </p>
            </div>
          </div>

          {status === 'PENDING_REVIEW' && (
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                onClick={() => applyReview('ACCEPT_ALL')}
                disabled={applying}
                className="rounded-xl bg-[#285942] px-4 py-2 text-xs font-bold text-white shadow hover:bg-[#1e4734] disabled:opacity-50"
              >
                Add all
              </button>
              <button
                onClick={() => applyReview('ACCEPT_SELECTED')}
                disabled={applying}
                className="rounded-xl border border-[#b8cbb6] bg-white px-3 py-2 text-xs font-bold text-[#285942] hover:bg-[#e8efe5] disabled:opacity-50"
              >
                Add selected
              </button>
              <button
                onClick={() => applyReview('REJECT_ALL')}
                disabled={applying}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Section A: Concept & Atmosphere */}
      <div className="surface-card p-6">
        <div className="border-b border-amber-100 pb-3 mb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-[#285942]">
            Plan Concept & Theme
          </span>
          <h3 className="text-xl font-bold text-slate-900 mt-1">{plan.concept.planTitle}</h3>
          <p className="mt-2 text-sm text-slate-600">{plan.concept.overview}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="rounded-2xl bg-amber-50/60 p-4 border border-amber-200/60">
            <span className="font-bold text-amber-900 block mb-1">Creative Theme:</span>
            <p className="text-slate-700">{plan.concept.theme}</p>
          </div>
          <div className="rounded-2xl bg-[#e8efe5]/60 p-4 border border-[#d5e1d3]/60">
            <span className="font-bold text-[#263b34] block mb-1">Atmosphere & Style:</span>
            <p className="text-slate-700">{plan.concept.atmosphere}</p>
          </div>
        </div>

        {plan.concept.missingInformation.length > 0 && (
          <div className="mt-4 rounded-2xl border border-amber-300/80 bg-amber-50/30 p-4 text-xs">
            <span className="font-bold text-amber-900 flex items-center gap-1.5 mb-1.5">
              <span>❓</span> Clarifications Requiring Confirmation:
            </span>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              {plan.concept.missingInformation.map((info, idx) => (
                <li key={idx}>{info}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Section B: Personalization & Inclusions */}
      <div className="surface-card p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4 border-b border-amber-100 pb-2">
          Personalization & Cultural Intelligence
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          {plan.personalization.culturalTraditions.length > 0 && (
            <div className="rounded-2xl border border-slate-200 p-4">
              <span className="font-bold text-slate-900 flex items-center gap-1.5 mb-2">
                <span>🪔</span> Cultural Traditions:
              </span>
              <ul className="space-y-1 text-slate-600">
                {plan.personalization.culturalTraditions.map((t, idx) => (
                  <li key={idx}>• {t}</li>
                ))}
              </ul>
            </div>
          )}

          {plan.personalization.dietaryPlans.length > 0 && (
            <div className="rounded-2xl border border-slate-200 p-4">
              <span className="font-bold text-slate-900 flex items-center gap-1.5 mb-2">
                <span>🥗</span> Dietary Accommodations:
              </span>
              <ul className="space-y-1 text-slate-600">
                {plan.personalization.dietaryPlans.map((d, idx) => (
                  <li key={idx}>• {d}</li>
                ))}
              </ul>
            </div>
          )}

          {plan.personalization.accessibilityNotes.length > 0 && (
            <div className="rounded-2xl border border-slate-200 p-4">
              <span className="font-bold text-slate-900 flex items-center gap-1.5 mb-2">
                <span>♿</span> Guest Accessibility & Care:
              </span>
              <ul className="space-y-1 text-slate-600">
                {plan.personalization.accessibilityNotes.map((a, idx) => (
                  <li key={idx}>• {a}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Section C: Proposed Budget Allocations */}
      <div className="surface-card p-6">
        <div className="flex items-center justify-between border-b border-amber-100 pb-3 mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Proposed Budget Allocations</h3>
            <p className="text-xs text-slate-500">
              Select categories to adopt into your live budget. Partial selection keeps the current contingency reserve.
            </p>
          </div>
          <span className="rounded-full bg-[#e8efe5] px-3 py-1 text-xs font-bold text-[#285942]">
            Pool: {formatCompactINR(plan.budgetPlan.availableAllocationPaise)}
          </span>
        </div>

        <div className="divide-y divide-amber-100">
          {plan.budgetPlan.categories.map((cat) => {
            const isChecked = selectedCategories[cat.name] ?? true;

            return (
              <div key={cat.id} className="py-3 flex items-start gap-3">
                <input
                  type="checkbox"
                  aria-label={`Adopt ${cat.name} budget category`}
                  checked={isChecked}
                  disabled={status !== 'PENDING_REVIEW'}
                  onChange={(e) =>
                    setSelectedCategories((prev) => ({
                      ...prev,
                      [cat.name]: e.target.checked,
                    }))
                  }
                  className="mt-1 h-5 w-5 rounded border-slate-300 text-[#285942] focus:ring-[#285942] cursor-pointer"
                />

                <div className="flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-sm text-slate-900">{cat.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500">
                        {cat.percentage}% of available pool
                      </span>
                      <span className="text-sm font-extrabold text-[#263b34]">
                        {formatINR(cat.allocatedPaise)}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{cat.rationale}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section D: Proposed Preparation Tasks */}
      <div className="surface-card p-6">
        <div className="flex items-center justify-between border-b border-amber-100 pb-3 mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Proposed Preparation Tasks</h3>
            <p className="text-xs text-slate-500">
              Check tasks you wish to add to your live checklist.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {plan.tasks.length} Proposed Tasks
          </span>
        </div>

        <div className="space-y-3">
          {plan.tasks.map((task) => {
            const isChecked = selectedTasks[task.id] ?? true;

            return (
              <div
                key={task.id}
                className="flex items-start gap-3 rounded-2xl border border-slate-200 p-3.5 hover:border-amber-300 transition-colors"
              >
                <input
                  type="checkbox"
                  aria-label={`Adopt task: ${task.title}`}
                  checked={isChecked}
                  disabled={status !== 'PENDING_REVIEW'}
                  onChange={(e) =>
                    setSelectedTasks((prev) => ({
                      ...prev,
                      [task.id]: e.target.checked,
                    }))
                  }
                  className="mt-1 h-5 w-5 rounded border-slate-300 text-[#285942] focus:ring-[#285942] cursor-pointer"
                />

                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-slate-900">{task.title}</span>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
                      {task.category}
                    </span>
                  </div>
                  {task.description && (
                    <p className="text-xs text-slate-500 mt-1">{task.description}</p>
                  )}
                  <div className="mt-2 flex items-center gap-3 text-xs text-slate-600">
                    <span>Target: {task.computedDueDateIso}</span>
                    {task.rationale && <span>• {task.rationale}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Final Action Bar */}
      {plan.agendaBlocks.length > 0 && (
        <section className="surface-card p-6" aria-labelledby="agenda-heading">
          <h3 id="agenda-heading" className="mb-4 text-lg font-bold text-slate-900">Proposed Timeline</h3>
          <div className="space-y-3">
            {plan.agendaBlocks.map((block, index) => (
              <label key={`${block.dayNumber}-${block.title}-${index}`} className="flex gap-3 rounded-xl border border-slate-200 p-3">
                <input type="checkbox" checked={selectedAgenda[index] ?? true} disabled={status !== 'PENDING_REVIEW'}
                  onChange={(event) => setSelectedAgenda((current) => ({ ...current, [index]: event.target.checked }))}
                  className="mt-1 h-5 w-5" />
                <span><strong className="block text-sm">Day {block.dayNumber}: {block.title}</strong>
                  <span className="block text-xs text-slate-600">{block.timeWindow} · {block.description}</span></span>
              </label>
            ))}
          </div>
        </section>
      )}

      {plan.vendorRequirements.length > 0 && (
        <section className="surface-card p-6" aria-labelledby="vendors-heading">
          <h3 id="vendors-heading" className="mb-4 text-lg font-bold text-slate-900">Proposed Vendor Checklist</h3>
          <div className="space-y-3">
            {plan.vendorRequirements.map((vendor, index) => (
              <label key={`${vendor.title}-${index}`} className="flex gap-3 rounded-xl border border-slate-200 p-3">
                <input type="checkbox" checked={selectedVendors[index] ?? true} disabled={status !== 'PENDING_REVIEW'}
                  onChange={(event) => setSelectedVendors((current) => ({ ...current, [index]: event.target.checked }))}
                  className="mt-1 h-5 w-5" />
                <span><strong className="block text-sm">{vendor.title} · {vendor.category}</strong>
                  <span className="block text-xs text-slate-600">{vendor.specifications}</span>
                  {vendor.comparisonCriteria.length > 0 && <span className="block text-xs text-slate-500">Compare: {vendor.comparisonCriteria.join('; ')}</span>}
                </span>
              </label>
            ))}
          </div>
        </section>
      )}

      {status === 'PENDING_REVIEW' && (
        <div className="sticky bottom-4 z-30 flex items-center justify-between rounded-2xl border border-[#b8cbb6] bg-white/95 p-4 shadow-xl backdrop-blur-md">
          <div className="text-xs text-slate-600">
            <span className="font-bold text-slate-900">Ready to adopt?</span> Selected budget categories and
            tasks will be updated in your live dashboard.
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => applyReview('REJECT_ALL')}
              disabled={applying}
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Dismiss
            </button>
            <button
              onClick={() => applyReview('ACCEPT_SELECTED')}
              disabled={applying}
              className="rounded-xl bg-[#285942] px-6 py-2.5 text-xs font-bold text-white shadow hover:bg-[#1e4734] disabled:opacity-50"
            >
              {applying ? 'Applying...' : '✓ Adopt Selected Suggestions'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
