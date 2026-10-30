import { getDb, getRawSqlite } from '@/lib/db';
import { aiPlanSuggestions, eventBudgets, budgetCategories, eventTasks, eventSchedules, vendorRequirements, vendorQuotes } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { NormalizedPlanSuggestion, NormalizedPlanSuggestionSchema } from '@/lib/ai/schemas';
import { getEventById } from './eventService';
import crypto from 'crypto';

export interface PlanSuggestionRecord {
  id: string;
  eventId: string;
  promptSummary: string;
  plan: NormalizedPlanSuggestion;
  status: string;
  modelUsed: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Saves a generated plan proposal into `ai_plan_suggestions` as PENDING_REVIEW.
 */
export async function savePlanSuggestion(
  eventId: string,
  promptSummary: string,
  plan: NormalizedPlanSuggestion,
  modelUsed: string
): Promise<PlanSuggestionRecord> {
  const db = getDb();
  const id = `sug_${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  db.insert(aiPlanSuggestions)
    .values({
      id,
      eventId,
      promptSummary,
      rawPayloadJson: JSON.stringify(plan),
      status: 'PENDING_REVIEW',
      modelUsed,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  return {
    id,
    eventId,
    promptSummary,
    plan,
    status: 'PENDING_REVIEW',
    modelUsed,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Gets the latest plan suggestion for an event.
 */
export async function getLatestPlanSuggestion(
  eventId: string,
  userId: string
): Promise<PlanSuggestionRecord | null> {
  const db = getDb();

  // Verify event access
  const eventDetail = await getEventById(eventId, userId);
  if (!eventDetail) {
    return null;
  }

  const list = db
    .select()
    .from(aiPlanSuggestions)
    .where(eq(aiPlanSuggestions.eventId, eventId))
    .orderBy(desc(aiPlanSuggestions.createdAt))
    .limit(1)
    .all();

  if (list.length === 0) {
    return null;
  }

  const rec = list[0];
  let plan: NormalizedPlanSuggestion;
  try {
    plan = NormalizedPlanSuggestionSchema.parse(JSON.parse(rec.rawPayloadJson));
  } catch {
    return null;
  }

  return {
    id: rec.id,
    eventId: rec.eventId,
    promptSummary: rec.promptSummary,
    plan,
    status: rec.status,
    modelUsed: rec.modelUsed,
    createdAt: rec.createdAt,
    updatedAt: rec.updatedAt,
  };
}

/**
 * Applies accepted suggestions (budget categories and/or tasks) transactionally.
 * Idempotent: does not duplicate tasks if already applied.
 */
export async function applyPlanReview(
  eventId: string,
  suggestionId: string,
  options: {
    action: 'ACCEPT_ALL' | 'ACCEPT_SELECTED' | 'REJECT_ALL';
    selectedCategoryNames?: string[];
    selectedTaskIds?: string[];
    selectedAgendaIndices?: number[];
    selectedVendorIndices?: number[];
  },
  userId: string
): Promise<{ success: boolean; status: string; appliedCategoriesCount: number; appliedTasksCount: number; appliedAgendaCount: number; appliedVendorCount: number }> {
  const db = getDb();
  const rawSqlite = getRawSqlite();

  // 1. Verify event ownership
  const eventDetail = await getEventById(eventId, userId);
  if (!eventDetail) {
    throw new Error('Event not found or unauthorized.');
  }

  // 2. Fetch suggestion
  const suggestions = db
    .select()
    .from(aiPlanSuggestions)
    .where(and(eq(aiPlanSuggestions.id, suggestionId), eq(aiPlanSuggestions.eventId, eventId)))
    .all();

  if (suggestions.length === 0) {
    throw new Error('Plan suggestion record not found.');
  }

  const suggestion = suggestions[0];
  const now = new Date().toISOString();

  if (suggestion.status !== 'PENDING_REVIEW') {
    return { success: true, status: suggestion.status, appliedCategoriesCount: 0, appliedTasksCount: 0, appliedAgendaCount: 0, appliedVendorCount: 0 };
  }

  if (options.action === 'REJECT_ALL') {
    db.update(aiPlanSuggestions)
      .set({
        status: 'REJECTED',
        updatedAt: now,
      })
      .where(eq(aiPlanSuggestions.id, suggestionId))
      .run();

    return { success: true, status: 'REJECTED', appliedCategoriesCount: 0, appliedTasksCount: 0, appliedAgendaCount: 0, appliedVendorCount: 0 };
  }

  const parsedPlan = NormalizedPlanSuggestionSchema.parse(JSON.parse(suggestion.rawPayloadJson));
  let appliedCategoriesCount = 0;
  let appliedTasksCount = 0;
  let appliedAgendaCount = 0;
  let appliedVendorCount = 0;

  // Filter categories to apply
  const categoriesToApply =
    options.action === 'ACCEPT_ALL'
      ? parsedPlan.budgetPlan.categories
      : parsedPlan.budgetPlan.categories.filter((c) =>
          options.selectedCategoryNames?.includes(c.name)
        );

  // Filter tasks to apply
  const tasksToApply =
    options.action === 'ACCEPT_ALL'
      ? parsedPlan.tasks
      : parsedPlan.tasks.filter((t) => options.selectedTaskIds?.includes(t.id));
  const agendaToApply = parsedPlan.agendaBlocks.filter((_, index) =>
    options.action === 'ACCEPT_ALL' || options.selectedAgendaIndices?.includes(index));
  const vendorsToApply = parsedPlan.vendorRequirements.filter((_, index) =>
    options.action === 'ACCEPT_ALL' || options.selectedVendorIndices?.includes(index));
  const eventDays = eventDetail.event.endDate
    ? Math.round((Date.parse(`${eventDetail.event.endDate}T00:00:00Z`) -
        Date.parse(`${eventDetail.event.startDate}T00:00:00Z`)) / 86400000) + 1
    : 1;
  if (agendaToApply.some((block) => block.dayNumber > eventDays)) {
    throw new Error('Selected agenda extends beyond the event date range. Extend the event or deselect those items.');
  }
  const fullSelection = categoriesToApply.length === parsedPlan.budgetPlan.categories.length &&
    tasksToApply.length === parsedPlan.tasks.length &&
    agendaToApply.length === parsedPlan.agendaBlocks.length &&
    vendorsToApply.length === parsedPlan.vendorRequirements.length;
  const newStatus = fullSelection ? 'ACCEPTED' : 'PARTIALLY_ACCEPTED';
  let finalStatus = newStatus;

  // Atomic database transaction
  const executeTransaction = rawSqlite.transaction(() => {
    const current = db.select({ status: aiPlanSuggestions.status }).from(aiPlanSuggestions)
      .where(eq(aiPlanSuggestions.id, suggestionId)).get();
    if (current?.status !== 'PENDING_REVIEW') {
      finalStatus = current?.status || 'UNKNOWN';
      return;
    }
    // 1. Update budget categories if any selected
    if (categoriesToApply.length > 0) {
      const existing = db.select().from(budgetCategories)
        .where(eq(budgetCategories.eventId, eventId)).all();
      const selectedNames = new Set(categoriesToApply.map((cat) => cat.name.trim().toLowerCase()));
      const untouched = existing.filter((cat) => !selectedNames.has(cat.name.trim().toLowerCase()));
      const commitments = new Map<string, number>();
      for (const quote of db.select({ categoryId: vendorQuotes.categoryId, amount: vendorQuotes.quotedAmountPaise })
        .from(vendorQuotes).where(and(eq(vendorQuotes.eventId, eventId), eq(vendorQuotes.confirmedCommitment, true))).all()) {
        if (quote.categoryId) commitments.set(quote.categoryId, (commitments.get(quote.categoryId) || 0) + quote.amount);
      }
      const requireCommitmentRoom = (id: string, allocation: number) => {
        if (allocation < (commitments.get(id) || 0)) {
          throw new Error('Plan would reduce a category below its confirmed quote commitment. Review the budget first.');
        }
      };
      const contingency = options.action === 'ACCEPT_ALL'
        ? parsedPlan.budgetPlan.contingencyPaise
        : eventDetail.budget.contingencyPaise;
      const pool = eventDetail.budget.totalBudgetPaise - contingency;
      const selectedTotal = categoriesToApply.reduce((sum, cat) => sum + cat.allocatedPaise, 0);
      if (selectedTotal > pool) throw new Error('Selected allocations exceed the available budget.');

      // Keep category IDs so attached quotes remain linked. Only rebalance untouched
      // allocations when the proposal would otherwise exceed the event budget.
      const remaining = pool - selectedTotal;
      const untouchedTotal = untouched.reduce((sum, cat) => sum + cat.allocatedPaise, 0);
      if (untouchedTotal > remaining) {
        let assigned = 0;
        untouched.forEach((cat, index) => {
          const allocation = index === untouched.length - 1
            ? remaining - assigned
            : Math.floor((cat.allocatedPaise / untouchedTotal) * remaining);
          assigned += allocation;
          requireCommitmentRoom(cat.id, allocation);
          db.update(budgetCategories).set({ allocatedPaise: allocation, updatedAt: now })
            .where(eq(budgetCategories.id, cat.id)).run();
        });
      }

      if (options.action === 'ACCEPT_ALL') {
        db.update(eventBudgets).set({ contingencyPaise: contingency, updatedAt: now })
          .where(eq(eventBudgets.eventId, eventId)).run();
      }

      categoriesToApply.forEach((cat, idx) => {
        const match = existing.find((item) => item.name.trim().toLowerCase() === cat.name.trim().toLowerCase());
        if (match) {
          requireCommitmentRoom(match.id, cat.allocatedPaise);
          db.update(budgetCategories).set({ allocatedPaise: cat.allocatedPaise, updatedAt: now })
            .where(eq(budgetCategories.id, match.id)).run();
        } else {
          db.insert(budgetCategories).values({
            id: `cat_${crypto.randomUUID()}`,
            budgetId: eventDetail.budget.id,
            eventId,
            name: cat.name,
            allocatedPaise: cat.allocatedPaise,
            estimatedPaise: cat.allocatedPaise,
            sortOrder: idx,
            createdAt: now,
            updatedAt: now,
          }).run();
        }
        appliedCategoriesCount++;
      });
    }

    // 2. Insert accepted tasks (checking for duplicates by title)
    if (tasksToApply.length > 0) {
      const existingTasks = db
        .select({ title: eventTasks.title })
        .from(eventTasks)
        .where(eq(eventTasks.eventId, eventId))
        .all();
      const existingTitles = new Set(existingTasks.map((t) => t.title.toLowerCase().trim()));

      tasksToApply.forEach((tsk) => {
        if (!existingTitles.has(tsk.title.toLowerCase().trim())) {
          db.insert(eventTasks)
            .values({
              id: `tsk_${crypto.randomUUID()}`,
              eventId,
              title: tsk.title,
              description: tsk.description,
              category: tsk.category,
              status: 'TODO',
              priority: tsk.priority,
              dueDate: tsk.computedDueDateIso,
              isAiSuggested: true,
              createdAt: now,
              updatedAt: now,
            })
            .run();
          appliedTasksCount++;
          existingTitles.add(tsk.title.toLowerCase().trim());
        }
      });
    }

    const existingAgenda = new Set(db.select({ title: eventSchedules.title, date: eventSchedules.date })
      .from(eventSchedules).where(eq(eventSchedules.eventId, eventId)).all()
      .map((item) => `${item.date}:${item.title.trim().toLowerCase()}`));
    for (const block of agendaToApply) {
      const date = new Date(`${eventDetail.event.startDate}T00:00:00Z`);
      date.setUTCDate(date.getUTCDate() + block.dayNumber - 1);
      const dateIso = date.toISOString().slice(0, 10);
      const key = `${dateIso}:${block.title.trim().toLowerCase()}`;
      if (existingAgenda.has(key)) continue;
      db.insert(eventSchedules).values({
        id: `sch_${crypto.randomUUID()}`, eventId, dayNumber: block.dayNumber,
        date: dateIso, title: block.title,
        description: `${block.timeWindow ? `${block.timeWindow} — ` : ''}${block.description}`,
        isAllDay: false, sortOrder: block.dayNumber, isAiSuggested: true,
        createdAt: now, updatedAt: now,
      }).run();
      existingAgenda.add(key);
      appliedAgendaCount++;
    }

    const existingVendors = new Set(db.select({ title: vendorRequirements.title })
      .from(vendorRequirements).where(eq(vendorRequirements.eventId, eventId)).all()
      .map((item) => item.title.trim().toLowerCase()));
    for (const vendor of vendorsToApply) {
      const key = vendor.title.trim().toLowerCase();
      if (existingVendors.has(key)) continue;
      const criteria = vendor.comparisonCriteria.length
        ? `\nCompare: ${vendor.comparisonCriteria.join('; ')}` : '';
      db.insert(vendorRequirements).values({
        id: `req_${crypto.randomUUID()}`, eventId, category: vendor.category,
        title: vendor.title, specifications: `${vendor.specifications}${criteria}`,
        targetBudgetPaise: 0, status: 'OPEN', createdAt: now, updatedAt: now,
      }).run();
      existingVendors.add(key);
      appliedVendorCount++;
    }

    // 3. Mark suggestion status
    db.update(aiPlanSuggestions)
      .set({
        status: newStatus,
        appliedMetadataJson: JSON.stringify({
          appliedAt: now,
          appliedCategoriesCount,
          appliedTasksCount,
          appliedAgendaCount,
          appliedVendorCount,
        }),
        updatedAt: now,
      })
      .where(eq(aiPlanSuggestions.id, suggestionId))
      .run();
  });

  executeTransaction();

  return {
    success: true,
    status: finalStatus,
    appliedCategoriesCount,
    appliedTasksCount,
    appliedAgendaCount,
    appliedVendorCount,
  };
}
