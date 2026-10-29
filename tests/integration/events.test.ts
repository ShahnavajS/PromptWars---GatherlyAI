import { describe, it, expect, beforeEach } from 'vitest';
import {
  createEvent,
  getEventById,
  listEvents,
  updateCategoryAllocation,
  updateTask,
} from '@/lib/services/eventService';
import { getDb, getRawSqlite } from '@/lib/db';
import { events } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

describe('Event Database Integration & Vertical Slice', () => {
  beforeEach(() => {
    // Clear database before each test
    const rawSqlite = getRawSqlite();
    rawSqlite.exec(`
      DELETE FROM event_tasks;
      DELETE FROM budget_categories;
      DELETE FROM event_budgets;
      DELETE FROM events;
    `);
  });

  it('creates an event with deterministic budget categories and starter tasks transactionally', async () => {
    const input = {
      title: "Priya & Rohan's Gujarati Wedding",
      eventType: 'WEDDING' as const,
      startDate: '2026-11-20',
      endDate: '2026-11-22',
      venueCity: 'Ahmedabad',
      venueName: 'The Grand Bhagwati',
      targetGuestCount: 250,
      totalBudgetRupees: 1500000, // ₹15 Lakh
      timezone: 'Asia/Kolkata',
    };

    const detail = await createEvent(input, 'usr_test_1');

    expect(detail.event.id).toMatch(/^evt_/);
    expect(detail.event.title).toBe("Priya & Rohan's Gujarati Wedding");
    expect(detail.event.venueCity).toBe('Ahmedabad');

    // Budget verification
    expect(detail.budget.totalBudgetPaise).toBe(150000000); // 1.5 Cr paise = 15 Lakh
    expect(detail.categories.length).toBe(5);

    // Initial sum must equal 100% of budget
    const sumAllocated = detail.categories.reduce((acc, c) => acc + c.allocatedPaise, 0);
    expect(sumAllocated + detail.budget.contingencyPaise).toBe(150000000);
    expect(detail.budgetSummary.isOverBudget).toBe(false);
    expect(detail.budgetSummary.utilizationPercentage).toBe(100);

    // Starter tasks verification
    expect(detail.tasks.length).toBeGreaterThanOrEqual(4);
    expect(detail.tasks.every((t) => t.status === 'TODO')).toBe(true);
  });

  it('lists events with calculated aggregates', async () => {
    await createEvent(
      {
        title: 'Event A',
        eventType: 'BIRTHDAY',
        startDate: '2026-11-01',
        venueCity: 'Ahmedabad',
        targetGuestCount: 50,
        totalBudgetRupees: 100000,
        timezone: 'Asia/Kolkata',
      },
      'usr_test_list'
    );

    const list = await listEvents('usr_test_list');
    expect(list.length).toBe(1);
    expect(list[0].title).toBe('Event A');
    expect(list[0].totalTasksCount).toBeGreaterThan(0);
  });

  it('retrieves event by ID and isolates users', async () => {
    const detail = await createEvent(
      {
        title: 'Birthday Bash',
        eventType: 'BIRTHDAY',
        startDate: '2026-12-10',
        venueCity: 'Surat',
        targetGuestCount: 50,
        totalBudgetRupees: 100000,
        timezone: 'Asia/Kolkata',
      },
      'usr_owner'
    );

    const fetched = await getEventById(detail.event.id, 'usr_owner');
    expect(fetched).not.toBeNull();
    expect(fetched?.event.title).toBe('Birthday Bash');

    // Other user cannot access it
    const unauthorized = await getEventById(detail.event.id, 'usr_stranger');
    expect(unauthorized).toBeNull();
  });

  it('updates a budget category allocation and recalculates budget summary', async () => {
    const detail = await createEvent(
      {
        title: 'Community Festival',
        eventType: 'COMMUNITY',
        startDate: '2026-10-15',
        venueCity: 'Ahmedabad',
        targetGuestCount: 300,
        totalBudgetRupees: 500000, // ₹5 Lakh = 50,000,000 paise
        timezone: 'Asia/Kolkata',
      },
      'usr_test_1'
    );

    const targetCategory = detail.categories[0];
    const newAllocationPaise = targetCategory.allocatedPaise + 10000000; // Increase by ₹1 Lakh

    const result = await updateCategoryAllocation(
      detail.event.id,
      targetCategory.id,
      newAllocationPaise,
      'usr_test_1'
    );

    expect(result.updatedCategory.allocatedPaise).toBe(newAllocationPaise);
    expect(result.budgetSummary.isOverBudget).toBe(true);
    expect(result.budgetSummary.overBudgetPaise).toBe(10000000); // Exceeded by exactly ₹1 Lakh

    // Verify persisted state by refetching
    const refetched = await getEventById(detail.event.id, 'usr_test_1');
    const refetchedCat = refetched?.categories.find((c) => c.id === targetCategory.id);
    expect(refetchedCat?.allocatedPaise).toBe(newAllocationPaise);
  });

  it('toggles task completion status and persists change', async () => {
    const detail = await createEvent(
      {
        title: 'Anniversary Dinner',
        eventType: 'CELEBRATION',
        startDate: '2026-12-25',
        venueCity: 'Vadodara',
        targetGuestCount: 40,
        totalBudgetRupees: 80000,
        timezone: 'Asia/Kolkata',
      },
      'usr_test_1'
    );

    const firstTask = detail.tasks[0];
    expect(firstTask.status).toBe('TODO');

    // Mark as DONE
    const updated = await updateTask(
      detail.event.id,
      firstTask.id,
      { status: 'DONE' },
      'usr_test_1'
    );
    expect(updated.status).toBe('DONE');

    // Refetch and verify
    const refetched = await getEventById(detail.event.id, 'usr_test_1');
    const refetchedTask = refetched?.tasks.find((t) => t.id === firstTask.id);
    expect(refetchedTask?.status).toBe('DONE');
  });

  it('enforces foreign key cascading delete on event deletion', async () => {
    const detail = await createEvent(
      {
        title: 'Temporary Event',
        eventType: 'BIRTHDAY',
        startDate: '2026-08-01',
        venueCity: 'Rajkot',
        targetGuestCount: 20,
        totalBudgetRupees: 30000,
        timezone: 'Asia/Kolkata',
      },
      'usr_test_1'
    );

    const db = getDb();
    // Delete event directly
    db.delete(events).where(eq(events.id, detail.event.id)).run();

    // Verify event is gone
    const eventCheck = await getEventById(detail.event.id, 'usr_test_1');
    expect(eventCheck).toBeNull();

    // Verify categories and tasks were deleted by cascade
    const rawSqlite = getRawSqlite();
    const catRows = rawSqlite
      .prepare('SELECT count(*) as count FROM budget_categories WHERE event_id = ?')
      .get(detail.event.id) as { count: number };
    expect(catRows.count).toBe(0);

    const taskRows = rawSqlite
      .prepare('SELECT count(*) as count FROM event_tasks WHERE event_id = ?')
      .get(detail.event.id) as { count: number };
    expect(taskRows.count).toBe(0);
  });
});
