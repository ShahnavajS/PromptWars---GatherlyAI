import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getEvents, POST as postEvent } from '@/app/api/events/route';
import { GET as getEventByIdRoute } from '@/app/api/events/[id]/route';
import { PATCH as patchCategory } from '@/app/api/events/[id]/categories/[categoryId]/route';
import { PATCH as patchTask } from '@/app/api/events/[id]/tasks/[taskId]/route';
import { getRawSqlite } from '@/lib/db';

describe('API Route Handlers Integration', () => {
  beforeEach(() => {
    const rawSqlite = getRawSqlite();
    rawSqlite.exec(`
      DELETE FROM event_tasks;
      DELETE FROM budget_categories;
      DELETE FROM event_budgets;
      DELETE FROM events;
    `);
  });

  describe('GET /api/events', () => {
    it('returns empty list initially and populates after creation', async () => {
      const res = await getEvents();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.events)).toBe(true);
      expect(json.events.length).toBe(0);
    });
  });

  describe('POST /api/events', () => {
    it('creates an event and returns 201 with data on valid payload', async () => {
      const req = new NextRequest('http://localhost:3000/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Ahmedabad Sangeet & Reception',
          eventType: 'WEDDING',
          startDate: '2026-11-20',
          venueCity: 'Ahmedabad',
          targetGuestCount: 200,
          totalBudgetRupees: 1200000,
        }),
      });

      const res = await postEvent(req);
      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.event.title).toBe('Ahmedabad Sangeet & Reception');
      expect(json.data.budget.totalBudgetPaise).toBe(120000000);
    });

    it('returns 400 when title is missing or too short', async () => {
      const req = new NextRequest('http://localhost:3000/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Hi', // Less than 3 chars
          eventType: 'WEDDING',
          startDate: '2026-11-20',
          targetGuestCount: 100,
          totalBudgetRupees: 500000,
        }),
      });

      const res = await postEvent(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe('Validation failed.');
      expect(json.issues.some((i: { field: string }) => i.field === 'title')).toBe(true);
    });

    it('returns 400 when end date precedes start date', async () => {
      const req = new NextRequest('http://localhost:3000/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Invalid Date Wedding',
          eventType: 'WEDDING',
          startDate: '2026-11-20',
          endDate: '2026-11-18', // Earlier than start date
          targetGuestCount: 100,
          totalBudgetRupees: 500000,
        }),
      });

      const res = await postEvent(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.issues.some((i: { message: string }) => i.message.includes('End date must be on or after'))).toBe(true);
    });

    it('returns 400 when budget is below minimum ₹1,000', async () => {
      const req = new NextRequest('http://localhost:3000/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Low Budget Celebration',
          eventType: 'CELEBRATION',
          startDate: '2026-11-20',
          targetGuestCount: 10,
          totalBudgetRupees: 500, // < 1000
        }),
      });

      const res = await postEvent(req);
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/events/[id]', () => {
    it('returns 404 for non-existent event ID', async () => {
      const req = new NextRequest('http://localhost:3000/api/events/evt_non_existent');
      const res = await getEventByIdRoute(req, {
        params: Promise.resolve({ id: 'evt_non_existent' }),
      });

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe('Event not found.');
    });
  });

  describe('PATCH /api/events/[id]/categories/[categoryId]', () => {
    it('returns 400 for negative allocation paise', async () => {
      const req = new NextRequest('http://localhost:3000/api/events/evt_1/categories/cat_1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allocatedPaise: -500 }),
      });

      const res = await patchCategory(req, {
        params: Promise.resolve({ id: 'evt_1', categoryId: 'cat_1' }),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
    });
  });

  describe('PATCH /api/events/[id]/tasks/[taskId]', () => {
    it('returns 400 for invalid task status enum', async () => {
      const req = new NextRequest('http://localhost:3000/api/events/evt_1/tasks/tsk_1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'INVALID_STATUS' }),
      });

      const res = await patchTask(req, {
        params: Promise.resolve({ id: 'evt_1', taskId: 'tsk_1' }),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
    });
  });
});
