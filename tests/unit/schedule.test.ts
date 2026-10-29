import { describe, it, expect, beforeEach } from 'vitest';
import {
  detectConflicts,
  createScheduleItem,
  getScheduleItems,
  updateScheduleItem,
  deleteScheduleItem,
  ScheduleItem,
} from '@/lib/services/scheduleService';
import { createEvent } from '@/lib/services/eventService';
import { getRawSqlite } from '@/lib/db';

describe('Multi-Day Timeline & Conflict Intelligence (Unit & Service)', () => {
  beforeEach(() => {
    const rawSqlite = getRawSqlite();
    rawSqlite.exec(`
      DELETE FROM event_schedules;
      DELETE FROM event_tasks;
      DELETE FROM budget_categories;
      DELETE FROM event_budgets;
      DELETE FROM events;
    `);
  });

  describe('detectConflicts pure logic', () => {
    const makeItem = (
      id: string,
      date: string,
      startTime: string | null,
      endTime: string | null,
      isAllDay = false,
      title = 'Activity'
    ): ScheduleItem => ({
      id,
      eventId: 'evt_1',
      dayNumber: 1,
      date,
      title,
      description: null,
      startTime,
      endTime,
      isAllDay,
      location: null,
      sortOrder: 0,
      status: 'PLANNED',
      dependsOnScheduleId: null,
      isAiSuggested: false,
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z',
    });

    it('detects overlap between two activities on the same day', () => {
      const item1 = makeItem('s1', '2026-11-20', '10:00', '12:00', false, 'Sangeet Rehearsal');
      const item2 = makeItem('s2', '2026-11-20', '11:00', '13:00', false, 'Mandap Setup');

      const conflicts = detectConflicts([item1, item2]);
      expect(conflicts.length).toBe(1);
      expect(conflicts[0].item1.id).toBe('s1');
      expect(conflicts[0].item2.id).toBe('s2');
      expect(conflicts[0].reason).toContain('Time overlap');
    });

    it('detects no conflict when activities on same day do not overlap', () => {
      const item1 = makeItem('s1', '2026-11-20', '10:00', '12:00', false, 'Morning Pooja');
      const item2 = makeItem('s2', '2026-11-20', '14:00', '16:00', false, 'Lunch & Rest');

      const conflicts = detectConflicts([item1, item2]);
      expect(conflicts.length).toBe(0);
    });

    it('detects no conflict for activities at same time on different days', () => {
      const item1 = makeItem('s1', '2026-11-20', '10:00', '12:00', false, 'Day 1 Ceremony');
      const item2 = makeItem('s2', '2026-11-21', '10:00', '12:00', false, 'Day 2 Ceremony');

      const conflicts = detectConflicts([item1, item2]);
      expect(conflicts.length).toBe(0);
    });

    it('flags conflict when an all-day activity coincides with any other activity on the same day', () => {
      const allDay = makeItem('s1', '2026-11-20', null, null, true, 'Full Day Booking');
      const timed = makeItem('s2', '2026-11-20', '10:00', '11:00', false, 'Vendor Briefing');

      const conflicts = detectConflicts([allDay, timed]);
      expect(conflicts.length).toBe(1);
      expect(conflicts[0].reason).toContain('All-day activity conflicts');
    });
  });

  describe('Schedule Service Database Operations', () => {
    it('creates, lists, updates, and deletes schedule items transactionally with ownership enforcement', async () => {
      const eventDetail = await createEvent(
        {
          title: 'Timeline Test Wedding',
          eventType: 'WEDDING',
          startDate: '2026-11-20',
          endDate: '2026-11-22',
          venueCity: 'Udaipur',
          targetGuestCount: 200,
          totalBudgetRupees: 1000000,
        },
        'usr_timeline_test'
      );

      const eventId = eventDetail.event.id;
      const userId = 'usr_timeline_test';

      // 1. Create schedule item
      const created = await createScheduleItem(eventId, userId, {
        dayNumber: 1,
        date: '2026-11-20',
        title: 'Mehendi Ceremony',
        description: 'Traditional henna ceremony with live music',
        startTime: '14:00',
        endTime: '17:00',
        isAllDay: false,
        location: 'Poolside Lawn',
        sortOrder: 1,
      });

      expect(created.id).toMatch(/^sch_/);
      expect(created.title).toBe('Mehendi Ceremony');
      expect(created.location).toBe('Poolside Lawn');

      // 2. List schedule items
      const items = await getScheduleItems(eventId, userId);
      expect(items.length).toBe(1);
      expect(items[0].id).toBe(created.id);

      // 3. Update schedule item
      const updated = await updateScheduleItem(eventId, userId, created.id, {
        title: 'Mehendi & High Tea',
        endTime: '18:00',
      });
      expect(updated.title).toBe('Mehendi & High Tea');
      expect(updated.endTime).toBe('18:00');

      // 4. Cross-user isolation check
      await expect(
        getScheduleItems(eventId, 'usr_unauthorized')
      ).rejects.toThrow('NOT_FOUND');

      await expect(
        createScheduleItem(eventId, 'usr_unauthorized', {
          dayNumber: 2,
          date: '2026-11-21',
          title: 'Hacked Activity',
          isAllDay: true,
          sortOrder: 0,
        })
      ).rejects.toThrow('NOT_FOUND');

      // 5. Delete schedule item
      await deleteScheduleItem(eventId, userId, created.id);
      const itemsAfter = await getScheduleItems(eventId, userId);
      expect(itemsAfter.length).toBe(0);
    });
  });
});

