import { getDb, getRawSqlite } from '@/lib/db';
import { aiPlanSuggestions, eventBudgets, budgetCategories, eventTasks } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { NormalizedPlanSuggestion } from '@/lib/ai/schemas';
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
  userId = 'usr_demo'
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
    plan = JSON.parse(rec.rawPayloadJson);
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
  },
  userId = 'usr_demo'
): Promise<{ success: boolean; appliedCategoriesCount: number; appliedTasksCount: number }> {
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

  if (options.action === 'REJECT_ALL') {
    db.update(aiPlanSuggestions)
      .set({
        status: 'REJECTED',
        updatedAt: now,
      })
      .where(eq(aiPlanSuggestions.id, suggestionId))
      .run();

    return { success: true, appliedCategoriesCount: 0, appliedTasksCount: 0 };
  }

  const parsedPlan: NormalizedPlanSuggestion = JSON.parse(suggestion.rawPayloadJson);
  let appliedCategoriesCount = 0;
  let appliedTasksCount = 0;

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

  // Atomic database transaction
  const executeTransaction = rawSqlite.transaction(() => {
    // 1. Update budget categories if any selected
    if (categoriesToApply.length > 0) {
      // Remove existing initial starter categories to adopt the AI plan cleanly
      db.delete(budgetCategories).where(eq(budgetCategories.eventId, eventId)).run();

      // Update contingency on budget
      db.update(eventBudgets)
        .set({
          contingencyPaise: parsedPlan.budgetPlan.contingencyPaise,
          updatedAt: now,
        })
        .where(eq(eventBudgets.eventId, eventId))
        .run();

      // Insert new accepted categories
      categoriesToApply.forEach((cat, idx) => {
        db.insert(budgetCategories)
          .values({
            id: `cat_${crypto.randomUUID()}`,
            budgetId: eventDetail.budget.id,
            eventId,
            name: cat.name,
            allocatedPaise: cat.allocatedPaise,
            estimatedPaise: cat.allocatedPaise,
            sortOrder: idx,
            createdAt: now,
            updatedAt: now,
          })
          .run();
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
        }
      });
    }

    // 3. Mark suggestion status
    const newStatus =
      options.action === 'ACCEPT_ALL' ||
      (appliedCategoriesCount === parsedPlan.budgetPlan.categories.length &&
        appliedTasksCount === parsedPlan.tasks.length)
        ? 'ACCEPTED'
        : 'PARTIALLY_ACCEPTED';

    db.update(aiPlanSuggestions)
      .set({
        status: newStatus,
        appliedMetadataJson: JSON.stringify({
          appliedAt: now,
          appliedCategoriesCount,
          appliedTasksCount,
        }),
        updatedAt: now,
      })
      .where(eq(aiPlanSuggestions.id, suggestionId))
      .run();
  });

  executeTransaction();

  return {
    success: true,
    appliedCategoriesCount,
    appliedTasksCount,
  };
}
