import { getDb, getRawSqlite } from '@/lib/db';
import { vendors, vendorQuotes, events, budgetCategories, eventActivities } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { CreateVendorInput, UpdateVendorInput, CreateQuoteInput } from '@/lib/validation/vendor';
import crypto from 'crypto';

export type Vendor = typeof vendors.$inferSelect;
export type VendorQuote = typeof vendorQuotes.$inferSelect;

export interface VendorWithQuotes extends Vendor {
  quotes: VendorQuote[];
}

export interface ConfirmQuoteResult {
  quote: VendorQuote;
  category: typeof budgetCategories.$inferSelect | null;
  quotedAmountPaise: number;
  currentAllocatedPaise: number;
}

/**
 * Verifies event ownership. Throws Error('NOT_FOUND') if event doesn't belong to user.
 */
async function verifyEventOwnership(eventId: string, userId: string): Promise<void> {
  const db = getDb();
  const result = db
    .select({ id: events.id })
    .from(events)
    .where(and(eq(events.id, eventId), eq(events.userId, userId)))
    .all();

  if (result.length === 0) {
    throw new Error('NOT_FOUND');
  }
}

/**
 * Lists all vendors for an event.
 */
export async function getVendors(eventId: string, userId: string): Promise<Vendor[]> {
  await verifyEventOwnership(eventId, userId);

  const db = getDb();
  return db
    .select()
    .from(vendors)
    .where(eq(vendors.eventId, eventId))
    .all();
}

/**
 * Gets a single vendor with its quotes.
 */
export async function getVendorById(
  eventId: string,
  userId: string,
  vendorId: string
): Promise<VendorWithQuotes | null> {
  await verifyEventOwnership(eventId, userId);

  const db = getDb();
  const vendorList = db
    .select()
    .from(vendors)
    .where(and(eq(vendors.id, vendorId), eq(vendors.eventId, eventId)))
    .all();

  if (vendorList.length === 0) {
    return null;
  }

  const quotes = db
    .select()
    .from(vendorQuotes)
    .where(and(eq(vendorQuotes.vendorId, vendorId), eq(vendorQuotes.eventId, eventId)))
    .all();

  return { ...vendorList[0], quotes };
}

/**
 * Creates a vendor for an event.
 */
export async function createVendor(
  eventId: string,
  userId: string,
  input: CreateVendorInput
): Promise<Vendor> {
  await verifyEventOwnership(eventId, userId);

  const db = getDb();
  const now = new Date().toISOString();
  const id = `vnd_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;

  db.insert(vendors)
    .values({
      id,
      eventId,
      name: input.name,
      category: input.category,
      contactName: input.contactName ?? null,
      contactPhone: input.contactPhone ?? null,
      contactEmail: input.contactEmail || null,
      website: input.website || null,
      city: input.city ?? null,
      notes: input.notes ?? null,
      verificationStatus: 'UNVERIFIED',
      createdAt: now,
      updatedAt: now,
    })
    .run();

  const created = db
    .select()
    .from(vendors)
    .where(eq(vendors.id, id))
    .all();

  return created[0];
}

/**
 * Updates a vendor.
 */
export async function updateVendor(
  eventId: string,
  userId: string,
  vendorId: string,
  input: UpdateVendorInput
): Promise<Vendor> {
  await verifyEventOwnership(eventId, userId);

  const db = getDb();

  const existing = db
    .select()
    .from(vendors)
    .where(and(eq(vendors.id, vendorId), eq(vendors.eventId, eventId)))
    .all();

  if (existing.length === 0) {
    throw new Error('NOT_FOUND');
  }

  const now = new Date().toISOString();

  db.update(vendors)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.contactName !== undefined ? { contactName: input.contactName ?? null } : {}),
      ...(input.contactPhone !== undefined ? { contactPhone: input.contactPhone ?? null } : {}),
      ...(input.contactEmail !== undefined ? { contactEmail: input.contactEmail || null } : {}),
      ...(input.website !== undefined ? { website: input.website || null } : {}),
      ...(input.city !== undefined ? { city: input.city ?? null } : {}),
      ...(input.notes !== undefined ? { notes: input.notes ?? null } : {}),
      updatedAt: now,
    })
    .where(and(eq(vendors.id, vendorId), eq(vendors.eventId, eventId)))
    .run();

  const updated = db
    .select()
    .from(vendors)
    .where(eq(vendors.id, vendorId))
    .all();

  return updated[0];
}

/**
 * Deletes a vendor (cascade deletes quotes).
 */
export async function deleteVendor(
  eventId: string,
  userId: string,
  vendorId: string
): Promise<void> {
  await verifyEventOwnership(eventId, userId);

  const db = getDb();

  const existing = db
    .select()
    .from(vendors)
    .where(and(eq(vendors.id, vendorId), eq(vendors.eventId, eventId)))
    .all();

  if (existing.length === 0) {
    throw new Error('NOT_FOUND');
  }

  db.delete(vendors)
    .where(and(eq(vendors.id, vendorId), eq(vendors.eventId, eventId)))
    .run();
}

/**
 * Gets all quotes for an event.
 */
export async function getQuotesForEvent(eventId: string, userId: string): Promise<VendorQuote[]> {
  await verifyEventOwnership(eventId, userId);

  const db = getDb();
  return db
    .select()
    .from(vendorQuotes)
    .where(eq(vendorQuotes.eventId, eventId))
    .all();
}

/**
 * Gets quotes for a specific vendor.
 */
export async function getQuotesForVendor(
  eventId: string,
  userId: string,
  vendorId: string
): Promise<VendorQuote[]> {
  await verifyEventOwnership(eventId, userId);

  const db = getDb();
  return db
    .select()
    .from(vendorQuotes)
    .where(and(eq(vendorQuotes.vendorId, vendorId), eq(vendorQuotes.eventId, eventId)))
    .all();
}

/**
 * Creates a quote. Validates vendor belongs to event.
 */
export async function createQuote(
  eventId: string,
  userId: string,
  input: CreateQuoteInput
): Promise<VendorQuote> {
  await verifyEventOwnership(eventId, userId);

  const db = getDb();

  // Validate vendor belongs to this event
  const vendorList = db
    .select()
    .from(vendors)
    .where(and(eq(vendors.id, input.vendorId), eq(vendors.eventId, eventId)))
    .all();

  if (vendorList.length === 0) {
    throw new Error('Vendor not found in this event.');
  }

  const now = new Date().toISOString();
  const id = `qot_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;

  db.insert(vendorQuotes)
    .values({
      id,
      eventId,
      vendorId: input.vendorId,
      requirementId: null,
      categoryId: input.categoryId ?? null,
      quoteTitle: input.quoteTitle,
      quotedAmountPaise: input.quotedAmountPaise,
      currency: 'INR',
      quoteDate: input.quoteDate,
      validUntilDate: input.validUntilDate ?? null,
      status: 'RECEIVED',
      inclusionsJson: JSON.stringify(input.inclusions),
      exclusionsJson: JSON.stringify(input.exclusions),
      paymentTermsJson: input.paymentTerms ? JSON.stringify(input.paymentTerms) : null,
      cancellationPolicy: input.cancellationPolicy ?? null,
      notes: input.notes ?? null,
      sourceDocumentName: null,
      isExtractedByAi: false,
      confirmedCommitment: false,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  const created = db
    .select()
    .from(vendorQuotes)
    .where(eq(vendorQuotes.id, id))
    .all();

  return created[0];
}

/**
 * Updates a quote status (shortlist/reject).
 */
export async function updateQuoteStatus(
  eventId: string,
  userId: string,
  quoteId: string,
  status: string
): Promise<VendorQuote> {
  await verifyEventOwnership(eventId, userId);

  const db = getDb();

  const existing = db
    .select()
    .from(vendorQuotes)
    .where(and(eq(vendorQuotes.id, quoteId), eq(vendorQuotes.eventId, eventId)))
    .all();

  if (existing.length === 0) {
    throw new Error('NOT_FOUND');
  }

  const now = new Date().toISOString();

  db.update(vendorQuotes)
    .set({ status, updatedAt: now })
    .where(and(eq(vendorQuotes.id, quoteId), eq(vendorQuotes.eventId, eventId)))
    .run();

  const updated = db
    .select()
    .from(vendorQuotes)
    .where(eq(vendorQuotes.id, quoteId))
    .all();

  return updated[0];
}

/**
 * Confirms a quote as a commitment.
 * Sets status = ACCEPTED, sets other quotes for same vendor category = SUPERSEDED.
 * Updates budget category rateProvenance = VENDOR_QUOTED_RATE.
 * Does NOT auto-update allocatedPaise.
 * Returns quote, category, quotedAmountPaise, currentAllocatedPaise for UI.
 */
export async function confirmQuote(
  eventId: string,
  userId: string,
  quoteId: string,
  categoryId: string
): Promise<ConfirmQuoteResult> {
  await verifyEventOwnership(eventId, userId);

  const db = getDb();
  const rawSqlite = getRawSqlite();

  // Get the quote
  const quoteList = db
    .select()
    .from(vendorQuotes)
    .where(and(eq(vendorQuotes.id, quoteId), eq(vendorQuotes.eventId, eventId)))
    .all();

  if (quoteList.length === 0) {
    throw new Error('NOT_FOUND');
  }

  const quote = quoteList[0];

  // Get vendor to find category
  const vendorList = db
    .select()
    .from(vendors)
    .where(and(eq(vendors.id, quote.vendorId), eq(vendors.eventId, eventId)))
    .all();

  if (vendorList.length === 0) {
    throw new Error('Vendor not found.');
  }

  const vendor = vendorList[0];

  // Get budget category
  const categoryList = db
    .select()
    .from(budgetCategories)
    .where(and(eq(budgetCategories.id, categoryId), eq(budgetCategories.eventId, eventId)))
    .all();

  const category = categoryList.length > 0 ? categoryList[0] : null;
  const currentAllocatedPaise = category?.allocatedPaise ?? 0;

  const now = new Date().toISOString();

  const executeTransaction = rawSqlite.transaction(() => {
    // 1. Set this quote as ACCEPTED + confirmedCommitment = true
    db.update(vendorQuotes)
      .set({ status: 'ACCEPTED', confirmedCommitment: true, updatedAt: now })
      .where(eq(vendorQuotes.id, quoteId))
      .run();

    // 2. Supersede other quotes for same vendor category in this event
    // Find all vendors in same category for this event
    const sameCategory = db
      .select({ id: vendors.id })
      .from(vendors)
      .where(and(eq(vendors.category, vendor.category), eq(vendors.eventId, eventId)))
      .all();

    const sameCategoryVendorIds = sameCategory.map((v) => v.id);

    // Supersede all other quotes from same-category vendors (except this quote)
    if (sameCategoryVendorIds.length > 0) {
      const placeholders = sameCategoryVendorIds.map(() => '?').join(',');
      rawSqlite
        .prepare(
          `UPDATE vendor_quotes SET status = 'SUPERSEDED', updated_at = ?
           WHERE event_id = ? AND id != ? AND vendor_id IN (${placeholders})`
        )
        .run(now, eventId, quoteId, ...sameCategoryVendorIds);
    }

    // 3. Update budget category rateProvenance
    if (category) {
      db.update(budgetCategories)
        .set({ rateProvenance: 'VENDOR_QUOTED_RATE', updatedAt: now })
        .where(eq(budgetCategories.id, categoryId))
        .run();
    }

    // 4. Log activity
    db.insert(eventActivities)
      .values({
        id: `act_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`,
        eventId,
        actorId: userId,
        actionType: 'VENDOR_QUOTE_CONFIRMED',
        entityType: 'VENDOR_QUOTE',
        entityId: quoteId,
        changeSummary: `Confirmed quote "${quote.quoteTitle}" from vendor "${vendor.name}" for ${quote.quotedAmountPaise} paise.`,
        previousValuesJson: JSON.stringify({ status: quote.status }),
        newValuesJson: JSON.stringify({ status: 'ACCEPTED', confirmedCommitment: true }),
        findingsSummaryJson: null,
        approvedActionsJson: null,
        createdAt: now,
      })
      .run();
  });

  executeTransaction();

  // Fetch the updated quote
  const updatedQuote = db
    .select()
    .from(vendorQuotes)
    .where(eq(vendorQuotes.id, quoteId))
    .all()[0];

  return {
    quote: updatedQuote,
    category,
    quotedAmountPaise: updatedQuote.quotedAmountPaise,
    currentAllocatedPaise,
  };
}

/**
 * Applies confirmed quote amount to budget category allocation.
 * User has explicitly approved this update.
 * Maintains financial invariant.
 */
export async function applyQuoteToBudget(
  eventId: string,
  userId: string,
  quoteId: string,
  categoryId: string
): Promise<{ updatedCategory: typeof budgetCategories.$inferSelect; quotedAmountPaise: number }> {
  await verifyEventOwnership(eventId, userId);

  const db = getDb();
  const rawSqlite = getRawSqlite();

  // Get the quote
  const quoteList = db
    .select()
    .from(vendorQuotes)
    .where(and(eq(vendorQuotes.id, quoteId), eq(vendorQuotes.eventId, eventId)))
    .all();

  if (quoteList.length === 0) {
    throw new Error('NOT_FOUND');
  }

  const quote = quoteList[0];

  // Get budget category
  const categoryList = db
    .select()
    .from(budgetCategories)
    .where(and(eq(budgetCategories.id, categoryId), eq(budgetCategories.eventId, eventId)))
    .all();

  if (categoryList.length === 0) {
    throw new Error('Budget category not found.');
  }

  const now = new Date().toISOString();

  const executeTransaction = rawSqlite.transaction(() => {
    // Update allocatedPaise = quotedAmountPaise
    db.update(budgetCategories)
      .set({
        allocatedPaise: quote.quotedAmountPaise,
        rateProvenance: 'VENDOR_QUOTED_RATE',
        updatedAt: now,
      })
      .where(and(eq(budgetCategories.id, categoryId), eq(budgetCategories.eventId, eventId)))
      .run();

    // Also update the quote categoryId linkage
    db.update(vendorQuotes)
      .set({ categoryId, updatedAt: now })
      .where(eq(vendorQuotes.id, quoteId))
      .run();
  });

  executeTransaction();

  const updatedCategory = db
    .select()
    .from(budgetCategories)
    .where(eq(budgetCategories.id, categoryId))
    .all()[0];

  return {
    updatedCategory,
    quotedAmountPaise: quote.quotedAmountPaise,
  };
}

