import { describe, it, expect, beforeEach } from 'vitest';
import {
  createVendor,
  getVendors,
  createQuote,
  getQuotesForEvent,
  confirmQuote,
  applyQuoteToBudget,
  deleteVendor,
} from '@/lib/services/vendorService';
import { createEvent, getEventById } from '@/lib/services/eventService';
import { getRawSqlite } from '@/lib/db';

describe('Vendor Hub & Quotation Intelligence (Unit & Service)', () => {
  beforeEach(() => {
    const rawSqlite = getRawSqlite();
    rawSqlite.exec(`
      DELETE FROM vendor_quotes;
      DELETE FROM vendors;
      DELETE FROM event_activities;
      DELETE FROM event_schedules;
      DELETE FROM event_tasks;
      DELETE FROM budget_categories;
      DELETE FROM event_budgets;
      DELETE FROM events;
    `);
  });

  it('manages vendors, records evidence-based quotes, and handles quote confirmation with two-phase budget approval', async () => {
    const detail = await createEvent(
      {
        title: 'Vendor Hub Test Wedding',
        eventType: 'WEDDING',
        startDate: '2026-11-20',
        venueCity: 'Ahmedabad',
        targetGuestCount: 200,
        totalBudgetRupees: 1000000, // ₹10 Lakh
      },
      'usr_vendor_test'
    );

    const eventId = detail.event.id;
    const userId = 'usr_vendor_test';
    const cateringCategory = detail.categories.find((c) => c.name.toLowerCase().includes('cater'))!;
    expect(cateringCategory).toBeDefined();

    // 1. Create 2 competing catering vendors
    const vendorA = await createVendor(eventId, userId, {
      name: 'Royal Caterers Ahmedabad',
      category: 'CATERING',
      contactName: 'Ramesh Patel',
      contactPhone: '+91 98250 12345',
      city: 'Ahmedabad',
    });

    const vendorB = await createVendor(eventId, userId, {
      name: 'Swad Gourmet Banquet Services',
      category: 'CATERING',
      contactName: 'Kavita Shah',
      contactPhone: '+91 98250 67890',
      city: 'Ahmedabad',
    });

    expect(vendorA.id).toMatch(/^vnd_/);
    expect(vendorB.id).toMatch(/^vnd_/);

    const allVendors = await getVendors(eventId, userId);
    expect(allVendors.length).toBe(2);

    // 2. Add quotes for both vendors with scope, inclusions, and payment terms
    const quoteA = await createQuote(eventId, userId, {
      vendorId: vendorA.id,
      quoteTitle: 'Standard Gujarati & Kathiyawadi Buffet',
      quotedAmountPaise: 38000000, // ₹3.8 Lakh
      quoteDate: '2026-10-15',
      inclusions: ['Welcome Drinks', 'Live Fafda-Jalebi Counter', 'Dinner Buffet (40 items)', 'Mineral Water'],
      exclusions: ['Late night dessert station', 'Extra cutlery charges'],
      paymentTerms: { advancePercentage: 25, milestones: [] },
    });

    const quoteB = await createQuote(eventId, userId, {
      vendorId: vendorB.id,
      quoteTitle: 'Premium Royal Feast with Jain Counters',
      quotedAmountPaise: 42000000, // ₹4.2 Lakh
      quoteDate: '2026-10-16',
      inclusions: ['Complete Veg & Dedicated Jain Kitchen', 'Mocktail Bar', '5-Course Feast', 'Silverware Serving'],
      exclusions: ['Transportation outside SG Highway'],
      paymentTerms: { advancePercentage: 30, milestones: [] },
    });

    expect(quoteA.quotedAmountPaise).toBe(38000000);
    expect(quoteB.quotedAmountPaise).toBe(42000000);

    const eventQuotes = await getQuotesForEvent(eventId, userId);
    expect(eventQuotes.length).toBe(2);

    // 3. Confirm Quote A (Phase 1: Confirmation without silent budget mutation)
    const initialCategoryAllocation = cateringCategory.allocatedPaise;
    const confirmResult = await confirmQuote(eventId, userId, quoteA.id, cateringCategory.id);

    expect(confirmResult.quote.status).toBe('ACCEPTED');
    expect(confirmResult.quote.confirmedCommitment).toBe(true);
    expect(confirmResult.quotedAmountPaise).toBe(38000000);
    expect(confirmResult.currentAllocatedPaise).toBe(initialCategoryAllocation);

    // Verify competitor quote in same category was marked SUPERSEDED
    const quotesAfter = await getQuotesForEvent(eventId, userId);
    const updatedQuoteB = quotesAfter.find((q) => q.id === quoteB.id)!;
    expect(updatedQuoteB.status).toBe('SUPERSEDED');

    // Verify category rate provenance updated to VENDOR_QUOTED_RATE
    const eventAfterConfirm = await getEventById(eventId, userId);
    const updatedCatAfterConfirm = eventAfterConfirm!.categories.find((c) => c.id === cateringCategory.id)!;
    expect(updatedCatAfterConfirm.rateProvenance).toBe('VENDOR_QUOTED_RATE');
    // Ensure allocatedPaise was NOT silently modified yet
    expect(updatedCatAfterConfirm.allocatedPaise).toBe(initialCategoryAllocation);

    // 4. Apply Quote to Budget (Phase 2: Explicit User Approval)
    const applyResult = await applyQuoteToBudget(eventId, userId, quoteA.id, cateringCategory.id);
    expect(applyResult.quotedAmountPaise).toBe(38000000);
    expect(applyResult.updatedCategory.allocatedPaise).toBe(38000000);

    const eventAfterApply = await getEventById(eventId, userId);
    const updatedCatAfterApply = eventAfterApply!.categories.find((c) => c.id === cateringCategory.id)!;
    expect(updatedCatAfterApply.allocatedPaise).toBe(38000000);

    // 5. Cross-event & Cross-user Isolation
    await expect(
      getVendors(eventId, 'usr_unauthorized')
    ).rejects.toThrow('NOT_FOUND');

    await expect(
      confirmQuote(eventId, 'usr_unauthorized', quoteA.id, cateringCategory.id)
    ).rejects.toThrow('NOT_FOUND');

    // 6. Delete vendor cascades quotes
    await deleteVendor(eventId, userId, vendorB.id);
    const vendorsAfterDelete = await getVendors(eventId, userId);
    expect(vendorsAfterDelete.length).toBe(1);
    expect(vendorsAfterDelete[0].id).toBe(vendorA.id);
  });
});
