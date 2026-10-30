'use client';

import { useState, useEffect } from 'react';
import type { NormalizedPlanSuggestion } from '@/lib/ai/schemas';
import { formatCompactINR } from '@/lib/domain/formatting';
import PlanProposalReview from './PlanProposalReview';

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
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Suggestion state
  const [suggestionId, setSuggestionId] = useState<string | null>(null);
  const [plan, setPlan] = useState<NormalizedPlanSuggestion | null>(null);
  const [modelUsed, setModelUsed] = useState<string>('');
  const [isFallback, setIsFallback] = useState(false);
  const [status, setStatus] = useState<string>('IDLE');

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
          setIsFallback(data.suggestion.modelUsed === 'deterministic-starter-template');
          setStatus(data.suggestion.status);
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
      } else {
        setError(data.error || 'Failed to generate plan.');
      }
    } catch {
      setError('Network error while requesting AI plan.');
    } finally {
      setGenerating(false);
    }
  };

  // Quick Preset Helper
  const applyPreset = (text: string) => {
    setAdditionalContext(text);
  };

  return (
    <div className="space-y-8">
      {/* AI Planner Intake Card */}
      <div className="surface-card p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-100 pb-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#e8efe5] px-3 py-1 text-xs font-bold text-[#285942] mb-2">
              <span>Ideas, shaped around you</span>
            </div>
            <h2 className="font-editorial text-3xl text-[#263b34] sm:text-4xl">
              Imagine what it could be.
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Tell us about the feeling, traditions, food, and guest experience you want. We&apos;ll suggest a plan for you to review.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-1.5 text-xs font-semibold text-slate-700">
            <span>{!modelUsed ? 'No ideas generated yet' : isFallback ? 'Starter ideas' : 'AI suggestions'}</span>
          </div>
        </div>

        {error && (
          <div role="alert" className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <span className="font-bold">Error:</span> {error}
          </div>
        )}

        {successMessage && (
          <div role="status" className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
            {successMessage}
          </div>
        )}
        {generating && <p role="status" className="text-sm text-slate-600">Generating your plan…</p>}

        {/* Form area */}
        <div className="space-y-4">
          <div>
            <label htmlFor="additionalContext" className="block text-sm font-bold text-slate-800 mb-1.5">
              What would make this event feel like yours?
            </label>
            <textarea
              id="additionalContext"
              rows={4}
              placeholder="Tell us about the atmosphere, food, traditions, access needs, or any small detail that matters to you."
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 p-4 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#285942]"
            />
          </div>

          {/* Quick preset buttons */}
          <div>
            <span className="text-xs font-semibold text-slate-500 mr-2">Starting points:</span>
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
                Gujarati wedding
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
                Milestone birthday
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
                Community festival
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-3">
            <span className="text-xs text-slate-500">
              {eventTitle} ({eventType}) • {venueCity} • {targetGuestCount} guests • Ceiling: {formatCompactINR(totalBudgetPaise)}
            </span>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="button-primary"
            >
              <span>{generating ? 'Making suggestions…' : 'Create my ideas'}</span>
            </button>
          </div>
        </div>
      </div>

      {plan && suggestionId && <PlanProposalReview key={suggestionId} eventId={eventId} suggestionId={suggestionId} plan={plan}
        status={status} isFallback={isFallback} onError={setError}
        onReviewed={(newStatus, message) => {
          setStatus(newStatus);
          setSuccessMessage(message);
          if (newStatus !== 'REJECTED') onPlanApplied();
        }} />}
    </div>
  );
}
