import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

/**
 * Events aggregate table
 */
export const events = sqliteTable(
  'events',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().default('usr_demo'),
    title: text('title').notNull(),
    eventType: text('event_type').notNull(), // 'WEDDING' | 'BIRTHDAY' | 'COMMUNITY' | 'CELEBRATION'
    status: text('status').notNull().default('PLANNING'), // 'DRAFT' | 'PLANNING' | 'CONFIRMED' | 'COMPLETED' | 'ARCHIVED'
    startDate: text('start_date').notNull(), // ISO Date: YYYY-MM-DD
    endDate: text('end_date'), // Optional multi-day end date
    timezone: text('timezone').notNull().default('Asia/Kolkata'),
    currency: text('currency').notNull().default('INR'),
    targetGuestCount: integer('target_guest_count').notNull().default(100),
    venueName: text('venue_name'),
    venueCity: text('venue_city').notNull().default('Ahmedabad'),
    version: integer('version').notNull().default(1),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('idx_events_user_id').on(table.userId),
    index('idx_events_start_date').on(table.startDate),
  ]
);

/**
 * Event Budgets table (One-to-one with events)
 * All monetary amounts are stored as integer paise.
 */
export const eventBudgets = sqliteTable(
  'event_budgets',
  {
    id: text('id').primaryKey(),
    eventId: text('event_id')
      .notNull()
      .unique()
      .references(() => events.id, { onDelete: 'cascade' }),
    totalBudgetPaise: integer('total_budget_paise').notNull(),
    contingencyPaise: integer('contingency_paise').notNull().default(0),
    currency: text('currency').notNull().default('INR'),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('idx_budgets_event_id').on(table.eventId),
  ]
);

/**
 * Budget Categories table
 * Allocations and estimates in integer paise.
 */
export const budgetCategories = sqliteTable(
  'budget_categories',
  {
    id: text('id').primaryKey(),
    budgetId: text('budget_id')
      .notNull()
      .references(() => eventBudgets.id, { onDelete: 'cascade' }),
    eventId: text('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    allocatedPaise: integer('allocated_paise').notNull().default(0),
    estimatedPaise: integer('estimated_paise').notNull().default(0),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('idx_categories_event_id').on(table.eventId),
    index('idx_categories_budget_id').on(table.budgetId),
  ]
);

/**
 * AI Plan Suggestions table (Reviewable Staging for GenAI Plans)
 */
export const aiPlanSuggestions = sqliteTable(
  'ai_plan_suggestions',
  {
    id: text('id').primaryKey(),
    eventId: text('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    promptSummary: text('prompt_summary').notNull(),
    rawPayloadJson: text('raw_payload_json').notNull(),
    status: text('status').notNull().default('PENDING_REVIEW'), // 'PENDING_REVIEW' | 'ACCEPTED' | 'REJECTED' | 'SUPERSEDED'
    appliedMetadataJson: text('applied_metadata_json'),
    modelUsed: text('model_used').notNull().default('gemini-2.5-flash'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('idx_ai_suggestions_event_id').on(table.eventId),
    index('idx_ai_suggestions_status').on(table.status),
  ]
);
export const eventTasks = sqliteTable(
  'event_tasks',
  {
    id: text('id').primaryKey(),
    eventId: text('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    category: text('category').notNull().default('GENERAL'), // 'VENUE' | 'CATERING' | 'DECOR' | 'LOGISTICS' | 'GENERAL'
    status: text('status').notNull().default('TODO'), // 'TODO' | 'IN_PROGRESS' | 'DONE'
    priority: text('priority').notNull().default('MEDIUM'), // 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    dueDate: text('due_date'),
    assignedTo: text('assigned_to'),
    isAiSuggested: integer('is_ai_suggested', { mode: 'boolean' }).notNull().default(false),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('idx_tasks_event_id').on(table.eventId),
    index('idx_tasks_status').on(table.status),
  ]
);

/**
 * Event Activities table (Audit & Change Intelligence Log)
 */
export const eventActivities = sqliteTable(
  'event_activities',
  {
    id: text('id').primaryKey(),
    eventId: text('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    actorId: text('actor_id').notNull().default('usr_demo'),
    actionType: text('action_type').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    changeSummary: text('change_summary').notNull(),
    previousValuesJson: text('previous_values_json'),
    newValuesJson: text('new_values_json'),
    findingsSummaryJson: text('findings_summary_json'),
    approvedActionsJson: text('approved_actions_json'),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    index('idx_activities_event_id').on(table.eventId),
    index('idx_activities_created_at').on(table.createdAt),
  ]
);

