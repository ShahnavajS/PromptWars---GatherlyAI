import { describe, it, expect, beforeEach } from 'vitest';
import {
  createVendor,
  createQuote,
  confirmQuote,
  applyQuoteToBudget,
  getQuotesForEvent,
} from '@/lib/services/vendorService';
import { createEvent } from '@/lib/services/eventService';
import { getRawSqlite } from '@/lib/db';

describe('Quotation Comparison, Multi-Currency & Safe Superseding (Unit)', () => {
  const userId = 'usr_quote_tester';

  beforeEach(() => {
    const rawSqlite = getRawSqlite();
    rawSqlite.exec(`
      DELETE FROM vendor_quotes;
      DELETE FROM vendor_requirements;
      DELETE FROM vendors;
      DELETE FROM budget_categories;
      DELETE FROM event_budgets;
      DELETE FROM events;
    `);
  });

  it('stores and tracks quote currencies and prevents budget application on currency mismatch', async () => {
    const eventDetail = await createEvent(
      {
        title: 'International Wedding',
        eventType: 'WEDDING',
        startDate: '2026-12-10',
        venueCity: 'Udaipur',
        targetGuestCount: 150,
        totalBudgetRupees: 2500000, // INR
      },
      userId
    );

    const eventId = eventDetail.event.id;
    const decorCategory = eventDetail.categories.find((c) => c.name.toLowerCase().includes('decor'))!;

    const foreignVendor = await createVendor(eventId, userId, {
      name: 'Global Lighting UK',
      category: 'DECOR',
    });

    // Create quote in GBP / USD
    const usdQuote = await createQuote(eventId, userId, {
      vendorId: foreignVendor.id,
      quoteTitle: 'Architectural Projection Mapping',
      quotedAmountPaise: 500000, // $5,000 USD (in cents)
      currency: 'USD',
      quoteDate: '2026-10-20',
      inclusions: ['4K Projectors', '3D Mapping'],
      exclusions: ['Travel & Visa'],
      paymentTerms: { advancePercentage: 50, milestones: [] },
    });

    expect(usdQuote.currency).toBe('USD');

    // Confirm USD quote
    const confirmed = await confirmQuote(eventId, userId, usdQuote.id, decorCategory.id, false);
    expect(confirmed.quote.status).toBe('ACCEPTED');

    // Applying USD quote to INR budget category must fail with currency mismatch
    await expect(
      applyQuoteToBudget(eventId, userId, usdQuote.id, decorCategory.id)
    ).rejects.toThrow(/Currency mismatch/);
  });

  it('safely supersedes competing quotes ONLY when supersedeOthers is explicitly enabled', async () => {
    const eventDetail = await createEvent(
      {
        title: 'Comparison Celebration',
        eventType: 'CELEBRATION',
        startDate: '2026-11-25',
        venueCity: 'Mumbai',
        targetGuestCount: 100,
        totalBudgetRupees: 1000000,
      },
      userId
    );

    const eventId = eventDetail.event.id;
    const cat = eventDetail.categories[0];

    const vendorA = await createVendor(eventId, userId, { name: 'Vendor Alpha', category: 'VENUE' });
    const vendorB = await createVendor(eventId, userId, { name: 'Vendor Beta', category: 'VENUE' });

    const quoteA = await createQuote(eventId, userId, {
      vendorId: vendorA.id,
      quoteTitle: 'Alpha Package',
      quotedAmountPaise: 15000000,
      currency: 'INR',
      quoteDate: '2026-10-18',
    });

    const quoteB = await createQuote(eventId, userId, {
      vendorId: vendorB.id,
      quoteTitle: 'Beta Package',
      quotedAmountPaise: 18000000,
      currency: 'INR',
      quoteDate: '2026-10-19',
    });

    // 1. Confirm quoteA with supersedeOthers: false
    await confirmQuote(eventId, userId, quoteA.id, cat.id, false);

    const quotes1 = await getQuotesForEvent(eventId, userId);
    const quoteBAfterFirstConfirm = quotes1.find((q) => q.id === quoteB.id)!;
    // Quote B must remain RECEIVED (not superseded!)
    expect(quoteBAfterFirstConfirm.status).toBe('RECEIVED');

    // 2. Now confirm quoteB with supersedeOthers: true
    await confirmQuote(eventId, userId, quoteB.id, cat.id, true);

    const quotes2 = await getQuotesForEvent(eventId, userId);
    const quoteAAfterSecondConfirm = quotes2.find((q) => q.id === quoteA.id)!;
    const quoteBFinal = quotes2.find((q) => q.id === quoteB.id)!;

    expect(quoteBFinal.status).toBe('ACCEPTED');
    expect(quoteAAfterSecondConfirm.status).toBe('SUPERSEDED');
  });

  it('handles confirmQuote idempotently without error or state drift', async () => {
    const eventDetail = await createEvent(
      {
        title: 'Idempotency Test Event',
        eventType: 'CELEBRATION',
        startDate: '2026-11-28',
        venueCity: 'Pune',
        targetGuestCount: 50,
        totalBudgetRupees: 500000,
      },
      userId
    );

    const eventId = eventDetail.event.id;
    const cat = eventDetail.categories[0];

    const vendor = await createVendor(eventId, userId, { name: 'Music Hub', category: 'ENTERTAINMENT' });
    const quote = await createQuote(eventId, userId, {
      vendorId: vendor.id,
      quoteTitle: 'DJ Night',
      quotedAmountPaise: 5000000,
      currency: 'INR',
      quoteDate: '2026-10-15',
    });

    const firstConfirm = await confirmQuote(eventId, userId, quote.id, cat.id, false);
    expect(firstConfirm.quote.status).toBe('ACCEPTED');

    // Confirming again must succeed idempotently
    const secondConfirm = await confirmQuote(eventId, userId, quote.id, cat.id, false);
    expect(secondConfirm.quote.status).toBe('ACCEPTED');
    expect(secondConfirm.quotedAmountPaise).toBe(5000000);
  });
});
