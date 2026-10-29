'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { EventDetail } from '@/lib/services/eventService';
import { formatINR, formatCompactINR, formatDate, calculateDaysRemaining } from '@/lib/domain/formatting';
import PlanGeneratorView from '@/components/ai/PlanGeneratorView';
import ChangeImpactView from '@/components/impact/ChangeImpactView';
import TimelineView from '@/components/schedule/TimelineView';
import VendorHub from '@/components/vendor/VendorHub';
import CulturalPreferencesPanel from '@/components/cultural/CulturalPreferencesPanel';

export default function EventDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = use(params);

  const [data, setData] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'ai-planner' | 'change-impact' | 'timeline' | 'vendors' | 'preferences'>('overview');

  // Category editing state
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editAmountRupees, setEditAmountRupees] = useState<number>(0);
  const [savingCategory, setSavingCategory] = useState(false);

  // Task updating state
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  const refetchEvent = () => {
    fetch(`/api/events/${eventId}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setData(json.data);
          setActiveTab('overview');
          showToast('Live workspace updated with adopted suggestions! 🎉');
        }
      });
  };

  useEffect(() => {
    let ignore = false;

    fetch(`/api/events/${eventId}`)
      .then((res) => res.json())
      .then((json) => {
        if (ignore) return;
        if (json.success && json.data) {
          setData(json.data);
        } else {
          setError(json.error || 'Failed to load event workspace.');
        }
      })
      .catch(() => {
        if (!ignore) {
          setError('Network error while connecting to workspace.');
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [eventId]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Handle Category Allocation Edit
  const startEditCategory = (catId: string, currentPaise: number) => {
    setEditingCategoryId(catId);
    setEditAmountRupees(Math.round(currentPaise / 100));
  };

  const handleSaveCategory = async (categoryId: string) => {
    if (editAmountRupees < 0) {
      alert('Allocation cannot be negative.');
      return;
    }

    try {
      setSavingCategory(true);
      const allocatedPaise = Math.round(editAmountRupees * 100);

      const res = await fetch(`/api/events/${eventId}/categories/${categoryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allocatedPaise }),
      });

      const resJson = await res.json();
      if (resJson.success && resJson.data) {
        setData((prev) => {
          if (!prev) return prev;
          const updatedCategories = prev.categories.map((c) =>
            c.id === categoryId ? resJson.data.updatedCategory : c
          );
          return {
            ...prev,
            categories: updatedCategories,
            budgetSummary: resJson.data.budgetSummary,
          };
        });
        setEditingCategoryId(null);
        showToast('Budget allocation updated and recalculated.');
      } else {
        alert(resJson.error || 'Failed to update category.');
      }
    } catch {
      alert('Error updating category allocation.');
    } finally {
      setSavingCategory(false);
    }
  };

  // Handle Task Toggle
  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'DONE' ? 'TODO' : 'DONE';

    try {
      setUpdatingTaskId(taskId);
      const res = await fetch(`/api/events/${eventId}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });

      const resJson = await res.json();
      if (resJson.success && resJson.data) {
        setData((prev) => {
          if (!prev) return prev;
          const updatedTasks = prev.tasks.map((t) => (t.id === taskId ? resJson.data : t));
          return {
            ...prev,
            tasks: updatedTasks,
          };
        });
        showToast(nextStatus === 'DONE' ? 'Task marked as completed! 🎉' : 'Task reopened.');
      } else {
        alert(resJson.error || 'Failed to update task.');
      }
    } catch {
      alert('Error updating task status.');
    } finally {
      setUpdatingTaskId(null);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="h-10 w-48 animate-pulse rounded-lg bg-amber-100 mb-6" />
        <div className="h-64 animate-pulse rounded-3xl bg-amber-50/50 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="h-96 animate-pulse rounded-2xl bg-amber-50/40" />
          <div className="h-96 animate-pulse rounded-2xl bg-amber-50/40" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-8">
          <div className="text-4xl mb-3">⚠️</div>
          <h2 className="text-xl font-bold text-red-800">Workspace Unavailable</h2>
          <p className="mt-2 text-sm text-red-600">{error || 'Event could not be found.'}</p>
          <div className="mt-6">
            <Link
              href="/"
              className="rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
            >
              ← Back to My Events
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { event, categories, tasks, budgetSummary } = data;
  const countdown = calculateDaysRemaining(event.startDate);

  const completedTasks = tasks.filter((t) => t.status === 'DONE').length;
  const taskPercent = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-xl animate-fade-in">
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Breadcrumb & Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <nav className="flex items-center gap-2 text-sm text-slate-500">
          <Link href="/" className="hover:text-slate-900 transition-colors">
            Events
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-semibold">{event.title}</span>
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            ↻ Reload & Verify
          </button>
          <Link
            href="/events/new"
            className="rounded-lg bg-orange-50 border border-orange-200 px-3 py-1.5 text-xs font-bold text-orange-700 hover:bg-orange-100"
          >
            + New Event
          </Link>
        </div>
      </div>

      {/* Event Header Banner */}
      <div className="rounded-3xl border border-amber-200/80 bg-white p-6 sm:p-8 shadow-sm mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5 mb-2">
              <span className="rounded-full bg-orange-100 px-3 py-0.5 text-xs font-bold text-orange-800">
                {event.eventType}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-0.5 text-xs font-semibold text-slate-700">
                {event.status}
              </span>
              <span className="rounded-full bg-amber-100 px-3 py-0.5 text-xs font-bold text-amber-900">
                ⏳ {countdown.label}
              </span>
              <span className="rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-xs font-mono font-bold text-slate-600">
                v{event.version ?? 1}
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              {event.title}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs sm:text-sm text-slate-600">
              <span className="flex items-center gap-1.5">
                <span>📅</span>
                <span>
                  {formatDate(event.startDate, { format: 'long' })}
                  {event.endDate ? ` – ${formatDate(event.endDate, { format: 'long' })}` : ''}
                </span>
              </span>
              <span className="flex items-center gap-1.5">
                <span>📍</span>
                <span>
                  {event.venueName ? `${event.venueName}, ` : ''}
                  {event.venueCity}
                </span>
              </span>
              <span className="flex items-center gap-1.5">
                <span>👥</span>
                <span>{event.targetGuestCount} Target Guests</span>
              </span>
            </div>
          </div>

          <div className="flex flex-col items-start md:items-end rounded-2xl bg-amber-50/60 p-4 border border-amber-200/60">
            <span className="text-xs font-medium text-slate-500">Planned Budget Ceiling</span>
            <span className="text-2xl font-black text-slate-900">
              {formatINR(budgetSummary.totalBudgetPaise)}
            </span>
            <span className="text-xs text-orange-700 font-semibold mt-0.5">
              {formatCompactINR(budgetSummary.totalBudgetPaise)} total allocation
            </span>
            <button
              onClick={() => setActiveTab('change-impact')}
              className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-orange-700 transition-colors"
            >
              <span>⚡</span>
              <span>Edit Requirements</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="mb-8 flex items-center gap-3 border-b border-amber-200/80 pb-3">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${activeTab === 'overview'
              ? 'bg-orange-600 text-white shadow-sm'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-amber-50'
            }`}
        >
          <span>📊</span>
          <span>Overview & Live Budget</span>
        </button>

        <button
          onClick={() => setActiveTab('ai-planner')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${activeTab === 'ai-planner'
              ? 'bg-orange-600 text-white shadow-sm'
              : 'bg-gradient-to-r from-amber-50 to-orange-50 text-orange-900 border border-orange-300 hover:bg-orange-100/60'
            }`}
        >
          <span>✨</span>
          <span>AI Event Planner & Review</span>
          <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-black text-orange-800">
            Gemini
          </span>
        </button>

        <button
          onClick={() => setActiveTab('change-impact')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${activeTab === 'change-impact'
              ? 'bg-orange-600 text-white shadow-sm'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-amber-50'
            }`}
        >
          <span>⚡</span>
          <span>Change Impact & History</span>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-900">
            Intelligence
          </span>
        </button>

        <button
          onClick={() => setActiveTab('timeline')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${activeTab === 'timeline'
              ? 'bg-orange-600 text-white shadow-sm'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-amber-50'
            }`}
        >
          <span>🗓️</span>
          <span>Timeline</span>
        </button>

        <button
          onClick={() => setActiveTab('vendors')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${activeTab === 'vendors'
              ? 'bg-orange-600 text-white shadow-sm'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-amber-50'
            }`}
        >
          <span>🏪</span>
          <span>Vendor Hub</span>
        </button>

        <button
          onClick={() => setActiveTab('preferences')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${activeTab === 'preferences'
              ? 'bg-orange-600 text-white shadow-sm'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-amber-50'
            }`}
        >
          <span>🎨</span>
          <span>Cultural & Preferences</span>
        </button>
      </div>

      {activeTab === 'ai-planner' ? (
        <PlanGeneratorView
          eventId={event.id}
          eventTitle={event.title}
          eventType={event.eventType}
          venueCity={event.venueCity}
          targetGuestCount={event.targetGuestCount}
          totalBudgetPaise={budgetSummary.totalBudgetPaise}
          onPlanApplied={refetchEvent}
        />
      ) : activeTab === 'change-impact' ? (
        <ChangeImpactView eventDetail={data} onApplied={refetchEvent} />
      ) : activeTab === 'timeline' ? (
        <TimelineView eventId={event.id} />
      ) : activeTab === 'vendors' ? (
        <VendorHub eventId={event.id} categories={data.categories} />
      ) : activeTab === 'preferences' ? (
        <CulturalPreferencesPanel eventId={event.id} />
      ) : (
        <>
          {/* Over-budget alert banner if allocations exceed budget */}
          {budgetSummary.isOverBudget && (
            <div className="mb-8 flex items-center justify-between rounded-2xl border border-red-300 bg-red-50 p-5 text-red-900 shadow-sm animate-pulse">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⚠️</span>
                <div>
                  <h4 className="font-bold text-sm sm:text-base">
                    Budget Deficit Detected: Over by {formatINR(budgetSummary.overBudgetPaise)}
                  </h4>
                  <p className="text-xs text-red-700 mt-0.5">
                    Allocated categories plus contingency reserve exceed your total budget ceiling. Adjust
                    allocations below to maintain financial discipline.
                  </p>
                </div>
              </div>
              <span className="hidden sm:inline-block rounded-xl bg-red-200/80 px-3 py-1 text-xs font-bold text-red-900">
                {budgetSummary.utilizationPercentage}% Allocated
              </span>
            </div>
          )}

          {/* Grid: Left Column Budget, Right Column Tasks */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Budget Command Center (7 cols) */}
            <div className="lg:col-span-7 space-y-8">
              {/* Budget Overview Cards */}
              <div className="rounded-3xl border border-amber-200/80 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4 border-b border-amber-100 pb-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Budget Command Center</h2>
                    <p className="text-xs text-slate-500">Deterministic Integer-Paise Accounting</p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                    100% Deterministic
                  </span>
                </div>

                {/* 4 Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                  <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                      Total Cap
                    </span>
                    <p className="text-base sm:text-lg font-extrabold text-slate-900 mt-1">
                      {formatCompactINR(budgetSummary.totalBudgetPaise)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-orange-50 border border-orange-200 p-3">
                    <span className="text-[11px] font-semibold text-orange-700 uppercase tracking-wide">
                      Allocated
                    </span>
                    <p className="text-base sm:text-lg font-extrabold text-orange-900 mt-1">
                      {formatCompactINR(budgetSummary.allocatedTotalPaise)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3">
                    <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide">
                      Contingency (10%)
                    </span>
                    <p className="text-base sm:text-lg font-extrabold text-amber-900 mt-1">
                      {formatCompactINR(budgetSummary.contingencyPaise)}
                    </p>
                  </div>

                  <div
                    className={`rounded-2xl border p-3 ${budgetSummary.isOverBudget
                        ? 'bg-red-50 border-red-200 text-red-900'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      }`}
                  >
                    <span className="text-[11px] font-semibold uppercase tracking-wide">
                      {budgetSummary.isOverBudget ? 'Deficit' : 'Unallocated'}
                    </span>
                    <p className="text-base sm:text-lg font-extrabold mt-1">
                      {formatCompactINR(
                        budgetSummary.isOverBudget
                          ? budgetSummary.overBudgetPaise
                          : budgetSummary.remainingPaise
                      )}
                    </p>
                  </div>
                </div>

                {/* Utilization Bar */}
                <div className="mb-2">
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-600">Committed Budget Utilization</span>
                    <span className={budgetSummary.isOverBudget ? 'text-red-600' : 'text-slate-800'}>
                      {budgetSummary.utilizationPercentage}%
                    </span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${budgetSummary.isOverBudget
                          ? 'bg-red-500'
                          : budgetSummary.utilizationPercentage >= 90
                            ? 'bg-amber-500'
                            : 'bg-orange-500'
                        }`}
                      style={{ width: `${Math.min(100, budgetSummary.utilizationPercentage)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Categories Allocation List */}
              <div className="rounded-3xl border border-amber-200/80 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4 border-b border-amber-100 pb-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Category Allocations</h3>
                    <p className="text-xs text-slate-500">Edit any category to recalculate totals</p>
                  </div>
                  <span className="text-xs font-semibold text-slate-500">
                    {categories.length} Categories
                  </span>
                </div>

                <div className="divide-y divide-amber-100/80">
                  {categories.map((cat) => {
                    const isEditing = editingCategoryId === cat.id;
                    const percentage =
                      budgetSummary.totalBudgetPaise > 0
                        ? Math.round((cat.allocatedPaise / budgetSummary.totalBudgetPaise) * 100)
                        : 0;

                    return (
                      <div key={cat.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">{cat.name}</span>
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                              {percentage}% of total
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            Initial Estimate: {formatINR(cat.estimatedPaise)}
                          </div>
                        </div>

                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-500">
                                ₹
                              </span>
                              <input
                                type="number"
                                min="0"
                                step="1000"
                                value={editAmountRupees}
                                onChange={(e) => setEditAmountRupees(parseInt(e.target.value, 10) || 0)}
                                className="w-36 rounded-lg border border-orange-400 pl-6 pr-2 py-1.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                              />
                            </div>
                            <button
                              onClick={() => handleSaveCategory(cat.id)}
                              disabled={savingCategory}
                              className="rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-orange-500 disabled:opacity-50"
                            >
                              {savingCategory ? '...' : 'Save'}
                            </button>
                            <button
                              onClick={() => setEditingCategoryId(null)}
                              className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-4">
                            <span className="text-base font-extrabold text-slate-900">
                              {formatINR(cat.allocatedPaise)}
                            </span>
                            <button
                              onClick={() => startEditCategory(cat.id, cat.allocatedPaise)}
                              className="rounded-lg border border-amber-300 bg-amber-50/50 px-2.5 py-1 text-xs font-bold text-amber-900 hover:bg-amber-100 transition-colors"
                            >
                              Edit
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column: Tasks Checklist & Next Actions (5 cols) */}
            <div className="lg:col-span-5 space-y-8">
              {/* Preparation Tasks */}
              <div className="rounded-3xl border border-amber-200/80 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4 border-b border-amber-100 pb-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Preparation Checklist</h3>
                    <p className="text-xs text-slate-500">
                      {completedTasks} of {tasks.length} tasks completed
                    </p>
                  </div>
                  <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-bold text-orange-800">
                    {taskPercent}% Done
                  </span>
                </div>

                {/* Task list */}
                <div className="space-y-3">
                  {tasks.map((task) => {
                    const isDone = task.status === 'DONE';
                    const isUpdating = updatingTaskId === task.id;

                    return (
                      <div
                        key={task.id}
                        className={`flex items-start gap-3 rounded-2xl border p-3.5 transition-all ${isDone
                            ? 'border-emerald-200 bg-emerald-50/30'
                            : 'border-slate-200 bg-white hover:border-amber-300'
                          }`}
                      >
                        <input
                          type="checkbox"
                          checked={isDone}
                          disabled={isUpdating}
                          onChange={() => handleToggleTask(task.id, task.status)}
                          className="mt-1 h-5 w-5 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer disabled:opacity-50"
                        />

                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`text-sm font-bold ${isDone ? 'line-through text-slate-400' : 'text-slate-900'
                                }`}
                            >
                              {task.title}
                            </span>
                          </div>

                          {task.description && (
                            <p className="mt-1 text-xs text-slate-500 line-clamp-2">{task.description}</p>
                          )}

                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                              {task.category}
                            </span>
                            <span
                              className={`rounded px-2 py-0.5 text-[10px] font-bold ${task.priority === 'CRITICAL'
                                  ? 'bg-rose-100 text-rose-800'
                                  : task.priority === 'HIGH'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                            >
                              {task.priority}
                            </span>
                            {task.dueDate && (
                              <span className="text-[11px] text-slate-400">
                                Due {formatDate(task.dueDate, { format: 'short' })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Next Recommended Actions */}
              <div className="rounded-3xl border border-amber-300/80 bg-gradient-to-br from-amber-50 to-orange-50/40 p-6 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-bold text-amber-900 mb-2">
                  <span>💡</span>
                  <span>Next Recommended Action</span>
                </div>
                <h4 className="text-base font-extrabold text-slate-900">
                  {completedTasks === 0
                    ? 'Align on Family Expectations & Auspicious Dates'
                    : completedTasks < tasks.length
                      ? 'Review Venue Policies & Plate Count Details'
                      : 'All Initial Tasks Completed! Ready for Phase 3.'}
                </h4>
                <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                  In Phase 3, Google Gemini AI will analyze your event details to generate a comprehensive
                  multi-day ceremony schedule, custom themes, and vendor quotation comparisons.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
