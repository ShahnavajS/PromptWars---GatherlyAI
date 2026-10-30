'use client';

import { useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import type { EventDetail } from '@/lib/services/eventService';
import { formatINR, formatCompactINR, formatDate, calculateDaysRemaining } from '@/lib/domain/formatting';

const sectionLoading = () => <p role="status" className="py-8 text-sm text-[#596860]">Opening section…</p>;
const PlanGeneratorView = dynamic(() => import('@/components/ai/PlanGeneratorView'), { loading: sectionLoading });
const ChangeImpactView = dynamic(() => import('@/components/impact/ChangeImpactView'), { loading: sectionLoading });
const TimelineView = dynamic(() => import('@/components/schedule/TimelineView'), { loading: sectionLoading });
const VendorHub = dynamic(() => import('@/components/vendor/VendorHub'), { loading: sectionLoading });
const CulturalPreferencesPanel = dynamic(() => import('@/components/cultural/CulturalPreferencesPanel'), { loading: sectionLoading });

type Section = 'overview' | 'ai-planner' | 'timeline' | 'vendors' | 'change-impact' | 'preferences';
const sections: { id: Section; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'ai-planner', label: 'Ideas & plan' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'vendors', label: 'Vendors' },
  { id: 'change-impact', label: 'Adjust plan' },
  { id: 'preferences', label: 'Preferences' },
];

export default function EventDashboardClient({ eventId, initialData }: { eventId: string; initialData: EventDetail }) {
  const [data, setData] = useState(initialData);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Section>('overview');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editAmountRupees, setEditAmountRupees] = useState(0);
  const [savingCategory, setSavingCategory] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  function showMessage(text: string) {
    setMessage(text);
    window.setTimeout(() => setMessage(null), 4000);
  }
  async function refreshEvent(returnToOverview = false) {
    try {
      const response = await fetch('/api/events/' + eventId);
      const result = await response.json();
      if (!result.success || !result.data) throw new Error(result.error || 'Could not load this event.');
      setData(result.data);
      setError(null);
      if (returnToOverview) setActiveTab('overview');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load this event.');
    }
  }

  async function saveCategory(categoryId: string) {
    if (editAmountRupees < 0) { setError('Allocation cannot be negative.'); return; }
    setSavingCategory(true);
    setError(null);
    try {
      const response = await fetch('/api/events/' + eventId + '/categories/' + categoryId, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allocatedPaise: Math.round(editAmountRupees * 100) }),
      });
      const result = await response.json();
      if (!result.success || !result.data) throw new Error(result.error || 'Could not update this category.');
      setData((previous) => previous ? {
        ...previous,
        categories: previous.categories.map((category) => category.id === categoryId ? result.data.updatedCategory : category),
        budgetSummary: result.data.budgetSummary,
      } : previous);
      setEditingCategoryId(null);
      showMessage('Budget allocation updated.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update this category.');
    } finally {
      setSavingCategory(false);
    }
  }
  async function toggleTask(taskId: string, currentStatus: string) {
    const status = currentStatus === 'DONE' ? 'TODO' : 'DONE';
    setUpdatingTaskId(taskId);
    setError(null);
    try {
      const response = await fetch('/api/events/' + eventId + '/tasks/' + taskId, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const result = await response.json();
      if (!result.success || !result.data) throw new Error(result.error || 'Could not update this task.');
      setData((previous) => previous ? { ...previous, tasks: previous.tasks.map((task) => task.id === taskId ? result.data : task) } : previous);
      showMessage(status === 'DONE' ? 'Task completed.' : 'Task reopened.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update this task.');
    } finally {
      setUpdatingTaskId(null);
    }
  }

  const { event, categories, tasks, budgetSummary } = data;
  const completedTasks = tasks.filter((task) => task.status === 'DONE').length;
  const taskPercent = tasks.length ? Math.round(completedTasks / tasks.length * 100) : 0;
  const nextTask = tasks.find((task) => task.status !== 'DONE');
  const allocationPercent = budgetSummary.totalBudgetPaise ? Math.min(100, Math.round(budgetSummary.allocatedTotalPaise / budgetSummary.totalBudgetPaise * 100)) : 0;

  return (
    <div className="page-wrap py-8 sm:py-12">
      {message && <div role="status" className="fixed bottom-5 right-5 z-50 max-w-[calc(100vw-2.5rem)] rounded-xl bg-[#263b34] px-5 py-3 text-sm font-semibold text-white shadow-xl">{message}</div>}
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <nav aria-label="Breadcrumb" className="text-sm text-[#596860]"><Link href="/" className="underline underline-offset-4 hover:text-[#285942]">Your events</Link><span className="mx-2" aria-hidden="true">/</span><span aria-current="page">{event.title}</span></nav>
        <button type="button" onClick={() => refreshEvent()} className="button-text text-sm">Refresh plan</button>
      </div>
      <section className="relative overflow-hidden rounded-[28px] bg-[#e8eee4] p-7 sm:p-10" aria-labelledby="event-title">
        <div className="absolute -right-16 -top-32 h-[360px] w-[360px] rounded-full border-[55px] border-[#d6e4d4] opacity-80" aria-hidden="true" />
        <div className="relative grid gap-9 lg:grid-cols-[1fr_300px] lg:items-end">
          <div>
            <p className="eyebrow">Your planning space <span className="mx-2">/</span> {event.eventType.toLowerCase()}</p>
            <h1 id="event-title" className="font-editorial mt-4 max-w-3xl text-[clamp(2.8rem,5.5vw,5.4rem)] leading-[1.02] tracking-[-.06em]">{event.title}</h1>
            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#435a4e]">
              <span>{formatDate(event.startDate, { format: 'long' })}{event.endDate ? ' – ' + formatDate(event.endDate, { format: 'long' }) : ''}</span>
              <span>{event.venueName ? event.venueName + ', ' : ''}{event.venueCity}</span>
              <span>{event.targetGuestCount} guests planned</span>
            </div>
          </div>
          <div className="rounded-[20px] bg-[#285942] p-6 text-white">
            <p className="text-xs font-bold uppercase tracking-[.12em] text-[#d6e8d9]">Budget ceiling</p>
            <p className="font-editorial metric-number mt-2 text-4xl">{formatINR(budgetSummary.totalBudgetPaise)}</p>
            <p className="mt-3 text-sm text-[#d6e8d9]">{calculateDaysRemaining(event.startDate).label}</p>
            <button type="button" onClick={() => setActiveTab('change-impact')} className="mt-5 inline-flex min-h-11 items-center gap-2 border-b border-white pb-1 text-sm font-bold">Adjust event details <span aria-hidden="true">↗</span></button>
          </div>
        </div>
      </section>
      <nav aria-label="Event workspace sections" className="workspace-nav mt-7 flex flex-wrap gap-2 pb-3">
        {sections.map((section) => <button key={section.id} type="button" aria-pressed={activeTab === section.id} onClick={() => setActiveTab(section.id)} className="min-h-11 rounded-full border px-4 text-sm font-semibold transition-colors">{section.label}</button>)}
      </nav>
      <p role="status" className="sr-only">Showing {sections.find((section) => section.id === activeTab)?.label} section</p>
      {error && <p role="alert" className="mt-5 rounded-xl bg-[#fff0eb] p-4 text-sm font-semibold text-[#8f4938]">{error}</p>}

      {activeTab === 'ai-planner' ? <div className="mt-8"><PlanGeneratorView eventId={event.id} eventTitle={event.title} eventType={event.eventType} venueCity={event.venueCity} targetGuestCount={event.targetGuestCount} totalBudgetPaise={budgetSummary.totalBudgetPaise} onPlanApplied={() => { refreshEvent(true); showMessage('Your plan has been updated.'); }} /></div>
      : activeTab === 'timeline' ? <div className="mt-8"><TimelineView eventId={event.id} /></div>
      : activeTab === 'vendors' ? <div className="mt-8"><VendorHub eventId={event.id} categories={categories} /></div>
      : activeTab === 'change-impact' ? <div className="mt-8"><ChangeImpactView eventDetail={data} onApplied={() => { refreshEvent(true); showMessage('Your event has been updated.'); }} /></div>
      : activeTab === 'preferences' ? <div className="mt-8"><CulturalPreferencesPanel eventId={event.id} /></div>
      : <div className="mt-8 space-y-7">
        {budgetSummary.isOverBudget && <div role="alert" className="rounded-[18px] border border-[#d8a597] bg-[#fff0eb] p-5 text-sm text-[#7d3b2d]"><strong>Budget needs attention.</strong> Allocations and reserve exceed your ceiling by {formatINR(budgetSummary.overBudgetPaise)}. Adjust a category below.</div>}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="surface-card p-6"><p className="eyebrow">Budget allocated</p><p className="font-editorial metric-number mt-3 text-3xl">{formatCompactINR(budgetSummary.allocatedTotalPaise)}</p><p className="mt-2 text-sm text-[#596860]">{allocationPercent}% of your total budget</p></div>
          <div className="surface-card p-6"><p className="eyebrow">In reserve</p><p className="font-editorial metric-number mt-3 text-3xl">{formatCompactINR(budgetSummary.contingencyPaise)}</p><p className="mt-2 text-sm text-[#596860]">A little room for the unexpected</p></div>
          <div className="surface-card p-6"><p className="eyebrow">Checklist progress</p><p className="font-editorial metric-number mt-3 text-3xl">{completedTasks} / {tasks.length}</p><p className="mt-2 text-sm text-[#596860]">{taskPercent}% of tasks complete</p></div>
        </div>
        <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
          <section className="surface-card p-6 sm:p-8" aria-labelledby="budget-heading">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="eyebrow">Make every choice count</p><h2 id="budget-heading" className="font-editorial mt-2 text-3xl">Your budget</h2></div><button type="button" onClick={() => setActiveTab('change-impact')} className="button-text text-sm">Adjust total</button></div>
            <div className="mt-6 flex justify-between text-xs font-semibold text-[#596860]"><span>Allocated</span><span>{allocationPercent}%</span></div>
            <div role="progressbar" aria-label="Budget allocated" aria-valuenow={allocationPercent} aria-valuemin={0} aria-valuemax={100} className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#e4e9dc]"><div className="h-full rounded-full bg-[#285942]" style={{ width: allocationPercent + '%' }} /></div>
            <div className="mt-5 divide-y divide-[#e2e6da]">
              {categories.map((category) => (
                <div key={category.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div><h3 className="text-sm font-bold">{category.name}</h3><p className="mt-1 text-xs text-[#596860]">Initial estimate {formatINR(category.estimatedPaise)}</p></div>
                  {editingCategoryId === category.id ? <div className="flex flex-wrap items-center gap-2"><label className="sr-only" htmlFor={'allocation-' + category.id}>Allocation for {category.name} in rupees</label><input id={'allocation-' + category.id} type="number" min={0} step={1000} value={editAmountRupees} onChange={(event) => setEditAmountRupees(Number(event.target.value))} className="form-control w-36" /><button type="button" disabled={savingCategory} onClick={() => saveCategory(category.id)} className="button-primary">Save</button><button type="button" onClick={() => setEditingCategoryId(null)} className="button-secondary">Cancel</button></div>
                  : <div className="flex items-center gap-3"><strong className="metric-number text-sm">{formatINR(category.allocatedPaise)}</strong><button type="button" onClick={() => { setEditingCategoryId(category.id); setEditAmountRupees(Math.round(category.allocatedPaise / 100)); }} className="button-text text-sm" aria-label={'Edit allocation for ' + category.name}>Edit</button></div>}
                </div>
              ))}
            </div>
          </section>
          <div className="space-y-6">
            <section className="surface-card p-6 sm:p-8" aria-labelledby="tasks-heading">
              <div><p className="eyebrow">The little things add up</p><h2 id="tasks-heading" className="font-editorial mt-2 text-3xl">To-do list</h2></div>
              {tasks.length ? <ul className="mt-5 space-y-2">{tasks.map((task) => <li key={task.id}><label className="flex min-h-14 cursor-pointer items-start gap-3 rounded-xl px-2 py-3 hover:bg-[#f1f5ed]"><input type="checkbox" checked={task.status === 'DONE'} disabled={updatingTaskId === task.id} onChange={() => toggleTask(task.id, task.status)} className="mt-1 h-5 w-5 shrink-0" /><span className="min-w-0"><span className={'block text-sm font-semibold ' + (task.status === 'DONE' ? 'text-[#718078] line-through' : 'text-[#263b34]')}>{task.title}</span>{task.dueDate && <span className="mt-1 block text-xs text-[#596860]">Due {formatDate(task.dueDate, { format: 'short' })}</span>}</span></label></li>)}</ul> : <p className="mt-5 text-sm text-[#596860]">Your checklist is ready for new ideas.</p>}
            </section>
            <div className="rounded-[24px] bg-[#f1e5d0] p-7"><p className="eyebrow">A good next step</p><h3 className="font-editorial mt-3 text-2xl">{nextTask ? nextTask.title : 'You are caught up.'}</h3><p className="mt-3 text-sm leading-6 text-[#526356]">{nextTask?.description || 'Explore ideas for the next chapter of your event.'}</p><button type="button" onClick={() => setActiveTab('ai-planner')} className="mt-5 inline-flex min-h-11 items-center border-b border-[#285942] text-sm font-bold text-[#285942]">Explore ideas ↗</button></div>
          </div>
        </div>
      </div>}
    </div>
  );
}
