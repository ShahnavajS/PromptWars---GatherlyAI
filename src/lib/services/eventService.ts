import { getDb, getRawSqlite } from '@/lib/db';
import { events, eventBudgets, budgetCategories, eventTasks, eventActivities, eventPreferences } from '@/lib/db/schema';
import { eq, and, desc, asc, inArray, sum, count, sql } from 'drizzle-orm';
import { CreateEventInput, UpdateTaskInput } from '@/lib/validation/events';
import { getInitialSeedData } from '@/lib/domain/seeding';
import { getBudgetSummary, BudgetSummary } from '@/lib/domain/budget';
import crypto from 'crypto';

export interface EventDetail {
  event: typeof events.$inferSelect;
  budget: typeof eventBudgets.$inferSelect;
  categories: (typeof budgetCategories.$inferSelect)[];
  tasks: (typeof eventTasks.$inferSelect)[];
  budgetSummary: BudgetSummary;
  preferences?: typeof eventPreferences.$inferSelect | null;
}

export interface EventListItem {
  id: string;
  title: string;
  eventType: string;
  status: string;
  startDate: string;
  endDate: string | null;
  venueCity: string;
  targetGuestCount: number;
  totalBudgetPaise: number;
  allocatedTotalPaise: number;
  totalTasksCount: number;
  completedTasksCount: number;
  createdAt: string;
}

/**
 * Creates a new event with deterministic initial seeding within an atomic transaction.
 */
export async function createEvent(input: CreateEventInput, userId = 'usr_demo'): Promise<EventDetail> {
  const db = getDb();
  const rawSqlite = getRawSqlite();

  const now = new Date().toISOString();
  const eventId = `evt_${crypto.randomUUID()}`;
  const budgetId = `bdg_${crypto.randomUUID()}`;
  const totalBudgetPaise = input.totalBudgetRupees * 100;

  // Generate deterministic seed data
  const seed = getInitialSeedData(input.eventType, totalBudgetPaise, new Date(input.startDate));

  // Atomic database transaction
  const executeTransaction = rawSqlite.transaction(() => {
    // 1. Insert Event
    db.insert(events)
      .values({
        id: eventId,
        userId,
        title: input.title,
        eventType: input.eventType,
        status: 'PLANNING',
        startDate: input.startDate,
        endDate: input.endDate || null,
        timezone: input.timezone || 'Asia/Kolkata',
        currency: 'INR',
        targetGuestCount: input.targetGuestCount,
        venueName: input.venueName || null,
        venueCity: input.venueCity || 'Ahmedabad',
        version: 1,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    // 2. Insert Budget
    db.insert(eventBudgets)
      .values({
        id: budgetId,
        eventId,
        totalBudgetPaise,
        contingencyPaise: seed.contingencyPaise,
        currency: 'INR',
        updatedAt: now,
      })
      .run();

    // 3. Insert Initial Categories
    seed.categories.forEach((cat, index) => {
      db.insert(budgetCategories)
        .values({
          id: `cat_${crypto.randomUUID()}`,
          budgetId,
          eventId,
          name: cat.name,
          allocatedPaise: cat.allocatedPaise,
          estimatedPaise: cat.estimatedPaise,
          sortOrder: index,
          createdAt: now,
          updatedAt: now,
        })
        .run();
    });

    // 4. Insert Starter Tasks
    seed.tasks.forEach((tsk) => {
      db.insert(eventTasks)
        .values({
          id: `tsk_${crypto.randomUUID()}`,
          eventId,
          title: tsk.title,
          description: tsk.description,
          category: tsk.category,
          status: 'TODO',
          priority: tsk.priority,
          dueDate: tsk.dueDateIso,
          deadlineProvenance: tsk.deadlineProvenance || 'EVENT_RELATIVE',
          isAiSuggested: false,
          createdAt: now,
          updatedAt: now,
        })
        .run();
    });

    // 5. Initialize Cultural & Personalization Preferences
    const defaultPreset = input.culturalPreset || (input.eventType === 'COMMUNITY' ? 'COMMUNITY' : 'MODERN');
    const defaultDiet = input.dietaryPreference || 'MIXED';

    db.insert(eventPreferences)
      .values({
        id: `prf_${crypto.randomUUID()}`,
        eventId,
        culturalPreset: defaultPreset,
        dietaryPreference: defaultDiet,
        ceremonyOptionsJson: JSON.stringify([]),
        accessibilityNotes: '',
        decorStyle: '',
        entertainmentStyle: '',
        customTraditionsJson: JSON.stringify([]),
        venueCapacityMax: null,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    // 6. Record Initial Event Creation in Activity Log
    db.insert(eventActivities)
      .values({
        id: `act_${crypto.randomUUID()}`,
        eventId,
        actorId: userId,
        actionType: 'EVENT_CREATED',
        entityType: 'EVENT',
        entityId: eventId,
        changeSummary: `Created event workspace for "${input.title}" with initial budget and seed tasks.`,
        previousValuesJson: null,
        newValuesJson: JSON.stringify({
          title: input.title,
          eventType: input.eventType,
          startDate: input.startDate,
          endDate: input.endDate || null,
          targetGuestCount: input.targetGuestCount,
          totalBudgetRupees: input.totalBudgetRupees,
          venueCity: input.venueCity || 'Ahmedabad',
        }),
        findingsSummaryJson: null,
        approvedActionsJson: null,
        createdAt: now,
      })
      .run();
  });

  executeTransaction();

  const created = await getEventById(eventId, userId);
  if (!created) {
    throw new Error('Failed to retrieve newly created event.');
  }
  return created;
}

/**
 * Retrieves full event workspace details.
 */
export async function getEventById(eventId: string, userId = 'usr_demo'): Promise<EventDetail | null> {
  const db = getDb();

  const eventList = db
    .select()
    .from(events)
    .where(and(eq(events.id, eventId), eq(events.userId, userId)))
    .all();

  if (eventList.length === 0) {
    return null;
  }
  const event = eventList[0];

  const budgetList = db.select().from(eventBudgets).where(eq(eventBudgets.eventId, eventId)).all();
  if (budgetList.length === 0) {
    return null;
  }
  const budget = budgetList[0];

  const categories = db
    .select()
    .from(budgetCategories)
    .where(eq(budgetCategories.eventId, eventId))
    .orderBy(asc(budgetCategories.sortOrder))
    .all();

  const tasks = db
    .select()
    .from(eventTasks)
    .where(eq(eventTasks.eventId, eventId))
    .orderBy(asc(eventTasks.createdAt))
    .all();

  const budgetSummary = getBudgetSummary(
    budget.totalBudgetPaise,
    categories.map((c) => ({ allocatedPaise: c.allocatedPaise })),
    budget.contingencyPaise
  );

  const prefList = db.select().from(eventPreferences).where(eq(eventPreferences.eventId, eventId)).all();
  const preferences = prefList.length > 0 ? prefList[0] : null;

  return {
    event,
    budget,
    categories,
    tasks,
    budgetSummary,
    preferences,
  };
}

/**
 * Lists all events for a user with budget & task completion aggregates.
 */
export async function listEvents(userId = 'usr_demo'): Promise<EventListItem[]> {
  const db = getDb();

  const userEvents = db
    .select()
    .from(events)
    .where(eq(events.userId, userId))
    .orderBy(desc(events.createdAt))
    .all();

  if (userEvents.length === 0) return [];
  const ids = userEvents.map((event) => event.id);
  const budgets = new Map(db.select().from(eventBudgets).where(inArray(eventBudgets.eventId, ids)).all()
    .map((budget) => [budget.eventId, budget.totalBudgetPaise]));
  const allocations = new Map(db.select({ eventId: budgetCategories.eventId, total: sum(budgetCategories.allocatedPaise) })
    .from(budgetCategories).where(inArray(budgetCategories.eventId, ids))
    .groupBy(budgetCategories.eventId).all().map((row) => [row.eventId, Number(row.total || 0)]));
  const taskCounts = new Map(db.select({
    eventId: eventTasks.eventId,
    total: count(),
    completed: sql<number>`sum(case when ${eventTasks.status} = 'DONE' then 1 else 0 end)`,
  }).from(eventTasks).where(inArray(eventTasks.eventId, ids))
    .groupBy(eventTasks.eventId).all().map((row) => [row.eventId, row]));

  return userEvents.map((ev) => ({
      id: ev.id,
      title: ev.title,
      eventType: ev.eventType,
      status: ev.status,
      startDate: ev.startDate,
      endDate: ev.endDate,
      venueCity: ev.venueCity,
      targetGuestCount: ev.targetGuestCount,
      totalBudgetPaise: budgets.get(ev.id) ?? 0,
      allocatedTotalPaise: allocations.get(ev.id) ?? 0,
      totalTasksCount: taskCounts.get(ev.id)?.total ?? 0,
      completedTasksCount: taskCounts.get(ev.id)?.completed ?? 0,
      createdAt: ev.createdAt,
    }));
}

/**
 * Updates a budget category allocation.
 */
export async function updateCategoryAllocation(
  eventId: string,
  categoryId: string,
  allocatedPaise: number,
  userId = 'usr_demo'
): Promise<{ updatedCategory: typeof budgetCategories.$inferSelect; budgetSummary: BudgetSummary }> {
  const db = getDb();

  // Verify event ownership
  const eventDetail = await getEventById(eventId, userId);
  if (!eventDetail) {
    throw new Error('Event not found or unauthorized.');
  }

  const existingCategory = eventDetail.categories.find((c) => c.id === categoryId);
  if (!existingCategory) {
    throw new Error('Budget category not found in this event.');
  }

  const now = new Date().toISOString();

  db.update(budgetCategories)
    .set({
      allocatedPaise,
      updatedAt: now,
    })
    .where(and(eq(budgetCategories.id, categoryId), eq(budgetCategories.eventId, eventId)))
    .run();

  // Fetch updated event summary
  const updatedDetail = (await getEventById(eventId, userId))!;
  const updatedCategory = updatedDetail.categories.find((c) => c.id === categoryId)!;

  return {
    updatedCategory,
    budgetSummary: updatedDetail.budgetSummary,
  };
}

/**
 * Updates task status or details.
 */
export async function updateTask(
  eventId: string,
  taskId: string,
  input: UpdateTaskInput,
  userId = 'usr_demo'
): Promise<typeof eventTasks.$inferSelect> {
  const db = getDb();

  // Verify event ownership
  const eventDetail = await getEventById(eventId, userId);
  if (!eventDetail) {
    throw new Error('Event not found or unauthorized.');
  }

  const existingTask = eventDetail.tasks.find((t) => t.id === taskId);
  if (!existingTask) {
    throw new Error('Task not found in this event.');
  }

  const now = new Date().toISOString();

  db.update(eventTasks)
    .set({
      ...(input.status ? { status: input.status } : {}),
      ...(input.title ? { title: input.title } : {}),
      ...(input.priority ? { priority: input.priority } : {}),
      ...(input.assignedTo !== undefined ? { assignedTo: input.assignedTo } : {}),
      updatedAt: now,
    })
    .where(and(eq(eventTasks.id, taskId), eq(eventTasks.eventId, eventId)))
    .run();

  const refreshed = (await getEventById(eventId, userId))!;
  return refreshed.tasks.find((t) => t.id === taskId)!;
}
