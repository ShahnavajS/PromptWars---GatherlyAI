import { describe, it, expect, beforeEach } from 'vitest';
import {
  savePlanSuggestion,
  getLatestPlanSuggestion,
  applyPlanReview,
} from '@/lib/services/planReviewService';
import { createEvent, getEventById } from '@/lib/services/eventService';
import { getStarterPlanTemplate } from '@/lib/ai/fallbacks';
import { getRawSqlite } from '@/lib/db';

describe('Plan Review, Staging & Idempotent Acceptance Integration', () => {
  beforeEach(() => {
    const rawSqlite = getRawSqlite();
    rawSqlite.exec(`
      DELETE FROM ai_plan_suggestions;
      DELETE FROM event_tasks;
      DELETE FROM budget_categories;
      DELETE FROM event_budgets;
      DELETE FROM events;
    `);
  });

  it('stages generated plan as PENDING_REVIEW without modifying event workspace', async () => {
    const detail = await createEvent(
      {
        title: 'Reviewable Wedding',
        eventType: 'WEDDING',
        startDate: '2026-11-20',
        venueCity: 'Ahmedabad',
        targetGuestCount: 200,
        totalBudgetRupees: 1200000,
      },
      'usr_demo'
    );

    const fallback = getStarterPlanTemplate(
      'WEDDING',
      'Reviewable Wedding',
      'Ahmedabad',
      200,
      1200000,
      '2026-11-20'
    );

    const saved = await savePlanSuggestion(
      detail.event.id,
      'Vibrant Gujarati Wedding Notes',
      fallback.plan,
      'test-model'
    );

    expect(saved.status).toBe('PENDING_REVIEW');

    // Retrieve via latest suggestion query
    const latest = await getLatestPlanSuggestion(detail.event.id, 'usr_demo');
    expect(latest).not.toBeNull();
    expect(latest?.id).toBe(saved.id);
    expect(latest?.status).toBe('PENDING_REVIEW');

    // Existing event categories and tasks must remain UNCHANGED
    const currentWorkspace = await getEventById(detail.event.id, 'usr_demo');
    expect(currentWorkspace?.categories.length).toBe(detail.categories.length);
    expect(currentWorkspace?.tasks.every((t) => !t.isAiSuggested)).toBe(true);
  });

  it('rejects suggestions on REJECT_ALL without mutating event workspace', async () => {
    const detail = await createEvent(
      {
        title: 'Rejectable Wedding',
        eventType: 'WEDDING',
        startDate: '2026-11-20',
        venueCity: 'Ahmedabad',
        targetGuestCount: 200,
        totalBudgetRupees: 1200000,
      },
      'usr_demo'
    );

    const fallback = getStarterPlanTemplate(
      'WEDDING',
      'Rejectable Wedding',
      'Ahmedabad',
      200,
      1200000,
      '2026-11-20'
    );

    const saved = await savePlanSuggestion(
      detail.event.id,
      'Notes',
      fallback.plan,
      'test-model'
    );

    const result = await applyPlanReview(
      detail.event.id,
      saved.id,
      { action: 'REJECT_ALL' },
      'usr_demo'
    );

    expect(result.success).toBe(true);
    expect(result.appliedCategoriesCount).toBe(0);
    expect(result.appliedTasksCount).toBe(0);

    const latest = await getLatestPlanSuggestion(detail.event.id, 'usr_demo');
    expect(latest?.status).toBe('REJECTED');

    // Workspace untouched
    const currentWorkspace = await getEventById(detail.event.id, 'usr_demo');
    expect(currentWorkspace?.tasks.every((t) => !t.isAiSuggested)).toBe(true);
  });

  it('accepts all suggestions transactionally and marks ACCEPTED', async () => {
    const detail = await createEvent(
      {
        title: 'Acceptable Wedding',
        eventType: 'WEDDING',
        startDate: '2026-11-20',
        venueCity: 'Ahmedabad',
        targetGuestCount: 200,
        totalBudgetRupees: 1200000,
      },
      'usr_demo'
    );

    const fallback = getStarterPlanTemplate(
      'WEDDING',
      'Acceptable Wedding',
      'Ahmedabad',
      200,
      1200000,
      '2026-11-20'
    );

    const saved = await savePlanSuggestion(
      detail.event.id,
      'Notes',
      fallback.plan,
      'test-model'
    );

    const result = await applyPlanReview(
      detail.event.id,
      saved.id,
      { action: 'ACCEPT_ALL' },
      'usr_demo'
    );

    expect(result.success).toBe(true);
    expect(result.appliedCategoriesCount).toBe(fallback.plan.budgetPlan.categories.length);
    expect(result.appliedTasksCount).toBe(fallback.plan.tasks.length);

    // Verify workspace is updated
    const updated = await getEventById(detail.event.id, 'usr_demo');
    expect(updated?.tasks.some((t) => t.isAiSuggested)).toBe(true);
    const raw = getRawSqlite();
    expect((raw.prepare('SELECT count(*) AS n FROM event_schedules WHERE event_id = ?').get(detail.event.id) as { n: number }).n)
      .toBe(fallback.plan.agendaBlocks.length);
    expect((raw.prepare('SELECT count(*) AS n FROM vendor_requirements WHERE event_id = ?').get(detail.event.id) as { n: number }).n)
      .toBe(fallback.plan.vendorRequirements.length);

    const latest = await getLatestPlanSuggestion(detail.event.id, 'usr_demo');
    expect(latest?.status).toBe('ACCEPTED');
  });

  it('guarantees idempotency: repeated acceptance does not create duplicate tasks', async () => {
    const detail = await createEvent(
      {
        title: 'Idempotent Event',
        eventType: 'BIRTHDAY',
        startDate: '2026-12-01',
        venueCity: 'Surat',
        targetGuestCount: 50,
        totalBudgetRupees: 200000,
      },
      'usr_demo'
    );

    const fallback = getStarterPlanTemplate(
      'BIRTHDAY',
      'Idempotent Event',
      'Surat',
      50,
      200000,
      '2026-12-01'
    );

    const saved = await savePlanSuggestion(
      detail.event.id,
      'Birthday Notes',
      fallback.plan,
      'test-model'
    );

    // First acceptance
    await applyPlanReview(detail.event.id, saved.id, { action: 'ACCEPT_ALL' }, 'usr_demo');
    const firstCheck = await getEventById(detail.event.id, 'usr_demo');
    const firstCount = firstCheck!.tasks.length;

    // Second repeated acceptance
    const retryResult = await applyPlanReview(
      detail.event.id,
      saved.id,
      { action: 'ACCEPT_ALL' },
      'usr_demo'
    );
    expect(retryResult.appliedTasksCount).toBe(0); // 0 new duplicates added!

    const secondCheck = await getEventById(detail.event.id, 'usr_demo');
    expect(secondCheck!.tasks.length).toBe(firstCount); // Exact same task count preserved
    expect((getRawSqlite().prepare('SELECT count(*) AS n FROM vendor_requirements WHERE event_id = ?').get(detail.event.id) as { n: number }).n)
      .toBe(fallback.plan.vendorRequirements.length);
  });

  it('supports partial acceptance (ACCEPT_SELECTED) and marks PARTIALLY_ACCEPTED', async () => {
    const detail = await createEvent(
      {
        title: 'Partial Selection Event',
        eventType: 'WEDDING',
        startDate: '2026-11-20',
        venueCity: 'Ahmedabad',
        targetGuestCount: 200,
        totalBudgetRupees: 1200000,
      },
      'usr_demo'
    );

    const fallback = getStarterPlanTemplate(
      'WEDDING',
      'Partial Selection Event',
      'Ahmedabad',
      200,
      1200000,
      '2026-11-20'
    );

    const saved = await savePlanSuggestion(
      detail.event.id,
      'Notes',
      fallback.plan,
      'test-model'
    );

    // Accept only 2 categories and 1 task
    const selectedCats = [fallback.plan.budgetPlan.categories[0].name, fallback.plan.budgetPlan.categories[1].name];
    const selectedTask = [fallback.plan.tasks[0].id];
    const originalIds = new Map(detail.categories.map((category) => [category.name, category.id]));
    const sqlite = getRawSqlite();
    sqlite.prepare('INSERT INTO vendors (id, event_id, name, category, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run('vnd_partial', detail.event.id, 'Existing caterer', 'CATERING', '2026-10-01', '2026-10-01');
    sqlite.prepare('INSERT INTO vendor_quotes (id, event_id, vendor_id, category_id, quote_title, quoted_amount_paise, quote_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run('quo_partial', detail.event.id, 'vnd_partial', detail.categories[0].id, 'Catering quote', 100000, '2026-10-01', '2026-10-01', '2026-10-01');

    const result = await applyPlanReview(
      detail.event.id,
      saved.id,
      {
        action: 'ACCEPT_SELECTED',
        selectedCategoryNames: selectedCats,
        selectedTaskIds: selectedTask,
      },
      'usr_demo'
    );

    expect(result.appliedCategoriesCount).toBe(2);
    expect(result.appliedTasksCount).toBe(1);

    const latest = await getLatestPlanSuggestion(detail.event.id, 'usr_demo');
    expect(latest?.status).toBe('PARTIALLY_ACCEPTED');
    const updated = await getEventById(detail.event.id, 'usr_demo');
    for (const [name, id] of originalIds) {
      expect(updated?.categories.find((category) => category.name === name)?.id).toBe(id);
    }
    expect(updated!.categories.reduce((sum, category) => sum + category.allocatedPaise, 0))
      .toBeLessThanOrEqual(updated!.budget.totalBudgetPaise - updated!.budget.contingencyPaise);
    expect((sqlite.prepare('SELECT category_id FROM vendor_quotes WHERE id = ?').get('quo_partial') as { category_id: string }).category_id)
      .toBe(detail.categories[0].id);
  });

  it('blocks unauthorized users from reviewing or applying suggestions', async () => {
    const detail = await createEvent(
      {
        title: 'Private Event',
        eventType: 'WEDDING',
        startDate: '2026-11-20',
        venueCity: 'Ahmedabad',
        targetGuestCount: 200,
        totalBudgetRupees: 1200000,
      },
      'usr_real_owner'
    );

    const fallback = getStarterPlanTemplate(
      'WEDDING',
      'Private Event',
      'Ahmedabad',
      200,
      1200000,
      '2026-11-20'
    );

    const saved = await savePlanSuggestion(
      detail.event.id,
      'Notes',
      fallback.plan,
      'test-model'
    );

    await expect(
      applyPlanReview(detail.event.id, saved.id, { action: 'ACCEPT_ALL' }, 'usr_attacker')
    ).rejects.toThrow(/unauthorized/i);
  });

  it('does not reduce a confirmed quote commitment when adopting a plan', async () => {
    const detail = await createEvent({
      title: 'Committed Wedding', eventType: 'WEDDING', startDate: '2026-11-20',
      venueCity: 'Ahmedabad', targetGuestCount: 100, totalBudgetRupees: 1000000,
    });
    const fallback = getStarterPlanTemplate('WEDDING', detail.event.title, 'Ahmedabad', 100, 1000000, '2026-11-20');
    const saved = await savePlanSuggestion(detail.event.id, 'Notes', fallback.plan, 'test-model');
    const sqlite = getRawSqlite();
    sqlite.prepare('INSERT INTO vendors (id, event_id, name, category, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run('vnd_committed', detail.event.id, 'Caterer', 'CATERING', '2026-10-01', '2026-10-01');
    const protectedCategory = detail.categories[0];
    const proposed = fallback.plan.budgetPlan.categories.find((category) => category.name === protectedCategory.name)!;
    sqlite.prepare('INSERT INTO vendor_quotes (id, event_id, vendor_id, category_id, quote_title, quoted_amount_paise, quote_date, confirmed_commitment, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run('quo_committed', detail.event.id, 'vnd_committed', protectedCategory.id, 'Signed quote', proposed.allocatedPaise + 1, '2026-10-01', 1, '2026-10-01', '2026-10-01');

    await expect(applyPlanReview(detail.event.id, saved.id, {
      action: 'ACCEPT_SELECTED', selectedCategoryNames: [protectedCategory.name],
    })).rejects.toThrow(/confirmed quote commitment/);
    const after = await getEventById(detail.event.id);
    expect(after!.categories.find((category) => category.id === protectedCategory.id)?.allocatedPaise)
      .toBe(protectedCategory.allocatedPaise);
    expect((await getLatestPlanSuggestion(detail.event.id))?.status).toBe('PENDING_REVIEW');
  });

  it('rejects agenda blocks outside a single-day event', async () => {
    const detail = await createEvent({
      title: 'One Day Birthday', eventType: 'BIRTHDAY', startDate: '2026-11-20',
      venueCity: 'Pune', targetGuestCount: 50, totalBudgetRupees: 100000,
    });
    const fallback = getStarterPlanTemplate('BIRTHDAY', detail.event.title, 'Pune', 50, 100000, '2026-11-20');
    fallback.plan.agendaBlocks.push({ dayNumber: 2, title: 'Unplanned second day', timeWindow: 'Morning', description: 'Outside event range' });
    const saved = await savePlanSuggestion(detail.event.id, 'Notes', fallback.plan, 'test-model');
    await expect(applyPlanReview(detail.event.id, saved.id, { action: 'ACCEPT_ALL' }))
      .rejects.toThrow(/beyond the event date range/);
    expect((await getLatestPlanSuggestion(detail.event.id))?.status).toBe('PENDING_REVIEW');
  });
});

