'use client';

import { useState, useEffect } from 'react';
import { NormalizedPlanSuggestion } from '@/lib/ai/schemas';
import { formatINR, formatCompactINR } from '@/lib/domain/formatting';

interface PlanGeneratorViewProps {
  eventId: string;
  eventTitle: string;
  eventType: string;
  venueCity: string;
  targetGuestCount: number;
  totalBudgetPaise: number;
  onPlanApplied: () => void;
}

export default function PlanGeneratorView({
  eventId,
  eventTitle,
  eventType,
  venueCity,
  targetGuestCount,
  totalBudgetPaise,
  onPlanApplied,
}: PlanGeneratorViewProps) {
  const [additionalContext, setAdditionalContext] = useState('');
  const [generating, setGenerating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Suggestion state
  const [suggestionId, setSuggestionId] = useState<string | null>(null);
  const [plan, setPlan] = useState<NormalizedPlanSuggestion | null>(null);
  const [modelUsed, setModelUsed] = useState<string>('');
  const [isFallback, setIsFallback] = useState(false);
  const [status, setStatus] = useState<string>('IDLE');

  // Selection states for review
  const [selectedCategories, setSelectedCategories] = useState<Record<string, boolean>>({});
  const [selectedTasks, setSelectedTasks] = useState<Record<string, boolean>>({});

  // Check for existing pending suggestion on mount
  useEffect(() => {
    let ignore = false;
    fetch(`/api/ai/plan?eventId=${eventId}`)
      .then((res) => res.json())
      .then((data) => {
        if (ignore) return;
        if (data.success && data.suggestion) {
          setSuggestionId(data.suggestion.id);
          setPlan(data.suggestion.plan);
          setModelUsed(data.suggestion.modelUsed);
          setStatus(data.suggestion.status);

          // Initialize selections
          const catMap: Record<string, boolean> = {};
          data.suggestion.plan.budgetPlan.categories.forEach((c: { name: string }) => {
            catMap[c.name] = true;
          });
          setSelectedCategories(catMap);

          const taskMap: Record<string, boolean> = {};
          data.suggestion.plan.tasks.forEach((t: { id: string }) => {
            taskMap[t.id] = true;
          });
          setSelectedTasks(taskMap);
        }
      })
      .catch(() => {});

    return () => {
      ignore = true;
    };
  }, [eventId]);

  const handleGenerate = async () => {
    setError(null);
    setSuccessMessage(null);
    try {
      setGenerating(true);
      const res = await fetch('/api/ai/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          additionalContext,
        }),
      });

      const data = await res.json();
      if (data.success && data.plan) {
        setSuggestionId(data.suggestionId);
        setPlan(data.plan);
        setModelUsed(data.modelUsed);
        setIsFallback(Boolean(data.isFallback));
        setStatus('PENDING_REVIEW');

        // Select all by default
        const catMap: Record<string, boolean> = {};
        data.plan.budgetPlan.categories.forEach((c: { name: string }) => {
          catMap[c.name] = true;
        });
        setSelectedCategories(catMap);

        const taskMap: Record<string, boolean> = {};
        data.plan.tasks.forEach((t: { id: string }) => {
          taskMap[t.id] = true;
        });
        setSelectedTasks(taskMap);
      } else {
        setError(data.error || 'Failed to generate plan.');
      }
    } catch {
      setError('Network error while requesting AI plan.');
    } finally {
      setGenerating(false);
    }
  };

  const handleApplyReview = async (action: 'ACCEPT_ALL' | 'ACCEPT_SELECTED' | 'REJECT_ALL') => {
    if (!suggestionId) return;

    try {
      setApplying(true);
      setError(null);

      const selectedCategoryNames = Object.entries(selectedCategories)
        .filter(([, selected]) => selected)
        .map(([name]) => name);

      const selectedTaskIds = Object.entries(selectedTasks)
        .filter(([, selected]) => selected)
        .map(([id]) => id);

      const res = await fetch(`/api/ai/plan/${suggestionId}/review?eventId=${eventId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          selectedCategoryNames,
          selectedTaskIds,
        }),
      });

      const resData = await res.json();
      if (resData.success) {
        if (action === 'REJECT_ALL') {
          setStatus('REJECTED');
          setSuccessMessage('AI suggestions dismissed. Your workspace remains unchanged.');
        } else {
          setStatus('ACCEPTED');
          setSuccessMessage(
            `✓ Successfully applied ${resData.data.appliedCategoriesCount} budget categories and ${resData.data.appliedTasksCount} tasks to your event workspace!`
          );
          onPlanApplied();
        }
      } else {
        setError(resData.error || 'Failed to apply plan review.');
      }
    } catch {
      setError('Network error while applying review.');
    } finally {
      setApplying(false);
    }
  };

  // Quick Preset Helper
  const applyPreset = (text: string) => {
    setAdditionalContext(text);
  };

  return (
    <div className="space-y-8">
      {/* AI Planner Intake Card */}
      <div className="rounded-3xl border border-amber-200/80 bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-100 pb-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-800 mb-2">
              <span>✨</span>
              <span>GenAI Event Planning Co-Pilot</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              Personalized Event Plan Generator
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Provide your cultural, dietary, theme, and guest experience preferences. Google Gemini will
              generate a structured, reviewable plan tailored to your budget ceiling.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-1.5 text-xs font-semibold text-slate-700">
            <span>Model:</span>
            <span className="font-mono text-orange-800 font-bold">
              {modelUsed || 'gemini-2.5-flash'}
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <span className="font-bold">Error:</span> {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
            {successMessage}
          </div>
        )}

        {/* Form area */}
        <div className="space-y-4">
          <div>
            <label htmlFor="additionalContext" className="block text-sm font-bold text-slate-800 mb-1.5">
              Event Preferences & Planning Instructions
            </label>
            <textarea
              id="additionalContext"
              rows={4}
              placeholder="e.g. Plan a colorful Gujarati wedding for 250 guests. We need pure vegetarian and Jain catering with live food stations, a vibrant modern theme with marigold decor, a comfortable schedule for elderly grandparents, and photography with drone coverage."
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 p-4 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Quick preset buttons */}
          <div>
            <span className="text-xs font-semibold text-slate-500 mr-2">Quick Presets:</span>
            <div className="inline-flex flex-wrap gap-2 mt-1">
              <button
                type="button"
                onClick={() =>
                  applyPreset(
                    'Traditional Gujarati Wedding with Sangeet, Mehendi, pure vegetarian & Jain feast, elderly seating near mandap, colorful marigold decor.'
                  )
                }
                className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100"
              >
                💍 Gujarati Wedding
              </button>
              <button
                type="button"
                onClick={() =>
                  applyPreset(
                    'Milestone 50th Birthday celebration with dinner buffet, signature cake, audio/visual setup for nostalgic photo presentation, interactive party host.'
                  )
                }
                className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100"
              >
                🎂 Milestone Birthday
              </button>
              <button
                type="button"
                onClick={() =>
                  applyPreset(
                    'Community cultural festival with food counters, volunteer safety committees, stage lighting, public address permits, and hygiene stations.'
                  )
                }
                className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100"
              >
                🤝 Community Mela
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3">
            <span className="text-xs text-slate-500">
              {eventTitle} ({eventType}) • {venueCity} • {targetGuestCount} guests • Ceiling: {formatCompactINR(totalBudgetPaise)}
            </span>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-orange-600/20 hover:bg-orange-500 active:bg-orange-700 transition-all disabled:opacity-60"
            >
              <span>{generating ? '✨ Generating Structured Plan...' : '✨ Generate Plan with Gemini'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Reviewable Proposal Section */}
      {plan && (
        <div className="space-y-8 animate-fade-in">
          {/* Staging Notice Banner */}
          <div
            className={`rounded-2xl border p-5 ${
              status === 'ACCEPTED'
                ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                : status === 'REJECTED'
                ? 'border-slate-300 bg-slate-50 text-slate-800'
                : 'border-orange-300 bg-gradient-to-r from-orange-50 to-amber-50 text-orange-950'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{status === 'ACCEPTED' ? '✓' : '📋'}</span>
                <div>
                  <h4 className="font-extrabold text-sm sm:text-base">
                    {status === 'ACCEPTED'
                      ? 'Plan Adopted & Persisted'
                      : status === 'REJECTED'
                      ? 'Plan Dismissed'
                      : 'Reviewable Plan Proposal (Pending User Review)'}
                  </h4>
                  <p className="text-xs mt-0.5 opacity-90">
                    {status === 'ACCEPTED'
                      ? 'The selected budget categories and preparation tasks have been adopted into your event workspace.'
                      : isFallback
                      ? 'Generated using the deterministic starter blueprint engine (GEMINI_API_KEY unconfigured). Review and apply.'
                      : 'Generated with Google Gemini. Review the concept, budget allocations, and tasks below before accepting.'}
                  </p>
                </div>
              </div>

              {status === 'PENDING_REVIEW' && (
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    onClick={() => handleApplyReview('ACCEPT_ALL')}
                    disabled={applying}
                    className="rounded-xl bg-orange-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-orange-500 disabled:opacity-50"
                  >
                    Accept All
                  </button>
                  <button
                    onClick={() => handleApplyReview('ACCEPT_SELECTED')}
                    disabled={applying}
                    className="rounded-xl border border-orange-300 bg-white px-3 py-2 text-xs font-bold text-orange-800 hover:bg-orange-50 disabled:opacity-50"
                  >
                    Accept Selected
                  </button>
                  <button
                    onClick={() => handleApplyReview('REJECT_ALL')}
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
          <div className="rounded-3xl border border-amber-200/80 bg-white p-6 shadow-sm">
            <div className="border-b border-amber-100 pb-3 mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-orange-600">
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
              <div className="rounded-2xl bg-orange-50/60 p-4 border border-orange-200/60">
                <span className="font-bold text-orange-900 block mb-1">Atmosphere & Style:</span>
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
          <div className="rounded-3xl border border-amber-200/80 bg-white p-6 shadow-sm">
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
          <div className="rounded-3xl border border-amber-200/80 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-amber-100 pb-3 mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Proposed Budget Allocations</h3>
                <p className="text-xs text-slate-500">
                  Select categories to adopt into your live budget. 10% contingency reserve preserved.
                </p>
              </div>
              <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-800">
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
                      checked={isChecked}
                      disabled={status === 'ACCEPTED'}
                      onChange={(e) =>
                        setSelectedCategories((prev) => ({
                          ...prev,
                          [cat.name]: e.target.checked,
                        }))
                      }
                      className="mt-1 h-5 w-5 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                    />

                    <div className="flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold text-sm text-slate-900">{cat.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-500">
                            {cat.percentage}% of available pool
                          </span>
                          <span className="text-sm font-extrabold text-orange-900">
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
          <div className="rounded-3xl border border-amber-200/80 bg-white p-6 shadow-sm">
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
                      checked={isChecked}
                      disabled={status === 'ACCEPTED'}
                      onChange={(e) =>
                        setSelectedTasks((prev) => ({
                          ...prev,
                          [task.id]: e.target.checked,
                        }))
                      }
                      className="mt-1 h-5 w-5 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                    />

                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-slate-900">{task.title}</span>
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                          {task.category}
                        </span>
                      </div>
                      {task.description && (
                        <p className="text-xs text-slate-500 mt-1">{task.description}</p>
                      )}
                      <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-400">
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
          {status === 'PENDING_REVIEW' && (
            <div className="sticky bottom-4 z-30 flex items-center justify-between rounded-2xl border border-orange-300 bg-white/95 p-4 shadow-xl backdrop-blur-md">
              <div className="text-xs text-slate-600">
                <span className="font-bold text-slate-900">Ready to adopt?</span> Selected budget categories and
                tasks will be updated in your live dashboard.
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleApplyReview('REJECT_ALL')}
                  disabled={applying}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Dismiss
                </button>
                <button
                  onClick={() => handleApplyReview('ACCEPT_SELECTED')}
                  disabled={applying}
                  className="rounded-xl bg-orange-600 px-6 py-2.5 text-xs font-bold text-white shadow hover:bg-orange-500 disabled:opacity-50"
                >
                  {applying ? 'Applying...' : '✓ Adopt Selected Suggestions'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
