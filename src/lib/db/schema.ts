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
    venueCapacityMax: integer('venue_capacity_max'),
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
    rateProvenance: text('rate_provenance').notNull().default('UNKNOWN_RATE'), // 'USER_CONFIRMED_RATE' | 'VENDOR_QUOTED_RATE' | 'INFERRED_ESTIMATE' | 'UNKNOWN_RATE'
    unitRatePaise: integer('unit_rate_paise'),
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
    deadlineProvenance: text('deadline_provenance').notNull().default('UNKNOWN'), // 'EVENT_RELATIVE' | 'FIXED_DATE' | 'USER_SET' | 'UNKNOWN'
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

/**
 * Event Preferences (Cultural, Dietary, and Accessibility Personalization)
 */
export const eventPreferences = sqliteTable(
  'event_preferences',
  {
    id: text('id').primaryKey(),
    eventId: text('event_id')
      .notNull()
      .unique()
      .references(() => events.id, { onDelete: 'cascade' }),
    culturalPreset: text('cultural_preset').notNull().default('MODERN'), // 'GUJARATI' | 'PUNJABI' | 'SOUTH_INDIAN' | 'BENGALI' | 'MODERN' | 'COMMUNITY'
    dietaryPreference: text('dietary_preference').notNull().default('MIXED'), // 'PURE_VEG' | 'JAIN_AVAILABLE' | 'VEGAN' | 'HALAL' | 'MIXED'
    ceremonyOptionsJson: text('ceremony_options_json'),
    accessibilityNotes: text('accessibility_notes'),
    decorStyle: text('decor_style'),
    entertainmentStyle: text('entertainment_style'),
    customTraditionsJson: text('custom_traditions_json'),
    venueCapacityMax: integer('venue_capacity_max'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('idx_preferences_event_id').on(table.eventId),
  ]
);

/**
 * Event Schedules (Multi-Day Timeline Activities & Run-of-Show)
 */
export const eventSchedules = sqliteTable(
  'event_schedules',
  {
    id: text('id').primaryKey(),
    eventId: text('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    dayNumber: integer('day_number').notNull().default(1),
    date: text('date').notNull(), // ISO YYYY-MM-DD
    title: text('title').notNull(),
    description: text('description'),
    startTime: text('start_time'), // 'HH:MM' (24-hour) or null for all-day
    endTime: text('end_time'), // 'HH:MM'
    isAllDay: integer('is_all_day', { mode: 'boolean' }).notNull().default(false),
    location: text('location'),
    sortOrder: integer('sort_order').notNull().default(0),
    status: text('status').notNull().default('PLANNED'), // 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
    dependsOnScheduleId: text('depends_on_schedule_id'),
    isAiSuggested: integer('is_ai_suggested', { mode: 'boolean' }).notNull().default(false),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('idx_schedules_event_id').on(table.eventId),
    index('idx_schedules_date').on(table.date),
  ]
);

/**
 * Vendors table (Event-scoped service providers)
 */
export const vendors = sqliteTable(
  'vendors',
  {
    id: text('id').primaryKey(),
    eventId: text('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    category: text('category').notNull(), // 'VENUE' | 'CATERING' | 'DECOR' | 'PHOTOGRAPHY' | 'ENTERTAINMENT' | 'TRANSPORTATION' | 'INVITATIONS' | 'GENERAL'
    contactName: text('contact_name'),
    contactPhone: text('contact_phone'),
    contactEmail: text('contact_email'),
    website: text('website'),
    city: text('city'),
    notes: text('notes'),
    verificationStatus: text('verification_status').notNull().default('UNVERIFIED'), // 'UNVERIFIED' | 'VERIFIED_BY_USER' | 'PREVIOUSLY_USED'
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('idx_vendors_event_id').on(table.eventId),
    index('idx_vendors_category').on(table.category),
  ]
);

/**
 * Vendor Requirements (Service specifications and RFP scope)
 */
export const vendorRequirements = sqliteTable(
  'vendor_requirements',
  {
    id: text('id').primaryKey(),
    eventId: text('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    category: text('category').notNull(),
    title: text('title').notNull(),
    specifications: text('specifications').notNull(),
    targetBudgetPaise: integer('target_budget_paise').notNull().default(0),
    status: text('status').notNull().default('OPEN'), // 'OPEN' | 'QUOTES_RECEIVED' | 'AWARDED' | 'CANCELLED'
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('idx_requirements_event_id').on(table.eventId),
  ]
);

/**
 * Vendor Quotations (Evidence-based bids with inclusions, exclusions, and payment terms)
 */
export const vendorQuotes = sqliteTable(
  'vendor_quotes',
  {
    id: text('id').primaryKey(),
    eventId: text('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    vendorId: text('vendor_id')
      .notNull()
      .references(() => vendors.id, { onDelete: 'cascade' }),
    requirementId: text('requirement_id').references(() => vendorRequirements.id, {
      onDelete: 'set null',
    }),
    categoryId: text('category_id').references(() => budgetCategories.id, {
      onDelete: 'set null',
    }),
    quoteTitle: text('quote_title').notNull(),
    quotedAmountPaise: integer('quoted_amount_paise').notNull(),
    currency: text('currency').notNull().default('INR'),
    quoteDate: text('quote_date').notNull(), // ISO YYYY-MM-DD
    validUntilDate: text('valid_until_date'), // ISO YYYY-MM-DD
    status: text('status').notNull().default('RECEIVED'), // 'RECEIVED' | 'SHORTLISTED' | 'ACCEPTED' | 'REJECTED' | 'SUPERSEDED'
    inclusionsJson: text('inclusions_json'), // JSON array of string inclusions
    exclusionsJson: text('exclusions_json'), // JSON array of string exclusions
    paymentTermsJson: text('payment_terms_json'), // JSON object: advancePercentage, milestones
    cancellationPolicy: text('cancellation_policy'),
    notes: text('notes'),
    sourceDocumentName: text('source_document_name'),
    isExtractedByAi: integer('is_extracted_by_ai', { mode: 'boolean' }).notNull().default(false),
    confirmedCommitment: integer('confirmed_commitment', { mode: 'boolean' })
      .notNull()
      .default(false),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('idx_quotes_event_id').on(table.eventId),
    index('idx_quotes_vendor_id').on(table.vendorId),
    index('idx_quotes_status').on(table.status),
  ]
);


