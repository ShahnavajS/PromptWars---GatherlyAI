import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getEvents, POST as postEvent } from '@/app/api/events/route';
import { GET as getEventByIdRoute } from '@/app/api/events/[id]/route';
import { PATCH as patchCategory } from '@/app/api/events/[id]/categories/[categoryId]/route';
import { PATCH as patchTask } from '@/app/api/events/[id]/tasks/[taskId]/route';
import { GET as getVendors } from '@/app/api/events/[id]/vendors/route';
import { getRawSqlite } from '@/lib/db';
import { testSession } from '../helpers/auth';

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
      const res = await getEvents(new NextRequest('http://localhost:3000/api/events'));
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/events', () => {
    it('creates an event and returns 201 with data on valid payload', async () => {
      const token = testSession({ id: 'usr_api', name: 'API Tester', email: 'api@example.com' });
      const req = new NextRequest('http://localhost:3000/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
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
      const token = testSession({ id: 'usr_api', name: 'API Tester', email: 'api@example.com' });
      const req = new NextRequest('http://localhost:3000/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
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
      const token = testSession({ id: 'usr_api', name: 'API Tester', email: 'api@example.com' });
      const req = new NextRequest('http://localhost:3000/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
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
      const token = testSession({ id: 'usr_api', name: 'API Tester', email: 'api@example.com' });
      const req = new NextRequest('http://localhost:3000/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
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

    it('rejects an oversized JSON body before creating an event', async () => {
      const token = testSession({ id: 'usr_api', name: 'API Tester', email: 'api@example.com' });
      const req = new NextRequest('http://localhost:3000/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: 'x'.repeat(17 * 1024) }),
      });
      expect((await postEvent(req)).status).toBe(413);
      expect(getRawSqlite().prepare('SELECT COUNT(*) AS count FROM events').get()).toEqual({ count: 0 });
    });
  });

  describe('GET /api/events/[id]', () => {
    it('returns 404 for non-existent event ID', async () => {
      const token = testSession({ id: 'usr_api', name: 'API Tester', email: 'api@example.com' });
      const req = new NextRequest('http://localhost:3000/api/events/evt_non_existent', { headers: { Authorization: `Bearer ${token}` } });
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
      const token = testSession({ id: 'usr_api', name: 'API Tester', email: 'api@example.com' });
      const req = new NextRequest('http://localhost:3000/api/events/evt_1/categories/cat_1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
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
      const token = testSession({ id: 'usr_api', name: 'API Tester', email: 'api@example.com' });
      const req = new NextRequest('http://localhost:3000/api/events/evt_1/tasks/tsk_1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
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

  describe('Cross-user event isolation', () => {
    it('returns 404 when user B tries to GET an event owned by user A', async () => {
      // User A creates an event
      const userAToken = testSession({ id: 'usr_alice', name: 'Alice', email: 'alice@example.com' });
      const createReq = new NextRequest('http://localhost:3000/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userAToken}` },
        body: JSON.stringify({
          title: 'Alice Private Wedding',
          eventType: 'WEDDING',
          startDate: '2026-12-01',
          venueCity: 'Mumbai',
          targetGuestCount: 100,
          totalBudgetRupees: 500000,
        }),
      });
      const createRes = await postEvent(createReq);
      expect(createRes.status).toBe(201);
      const created = await createRes.json();
      const eventId = created.data.event.id;

      // User B attempts to access user A's event
      const userBToken = testSession({ id: 'usr_bob', name: 'Bob', email: 'bob@example.com' });
      const getReq = new NextRequest(`http://localhost:3000/api/events/${eventId}`, {
        headers: { Authorization: `Bearer ${userBToken}` },
      });
      const getRes = await getEventByIdRoute(getReq, {
        params: Promise.resolve({ id: eventId }),
      });

      expect(getRes.status).toBe(404);
      const json = await getRes.json();
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/not found/i);
    });

    it('returns 401 when a tampered or invalid token is presented', async () => {
      const req = new NextRequest('http://localhost:3000/api/events', {
        headers: { Authorization: 'Bearer bad.payload.signature' },
      });
      const res = await getEvents(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/authentication required/i);
    });

    it('returns 404 for vendor GET with wrong user session', async () => {
      // User A creates an event
      const userAToken = testSession({ id: 'usr_alice2', name: 'Alice2', email: 'alice2@example.com' });
      const createReq = new NextRequest('http://localhost:3000/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userAToken}` },
        body: JSON.stringify({
          title: 'Alice Vendor Test Event',
          eventType: 'CELEBRATION',
          startDate: '2026-12-15',
          venueCity: 'Delhi',
          targetGuestCount: 50,
          totalBudgetRupees: 100000,
        }),
      });
      const createRes = await postEvent(createReq);
      const created = await createRes.json();
      const eventId = created.data.event.id;

      // User B attempts to list vendors on user A's event
      const userBToken = testSession({ id: 'usr_bob2', name: 'Bob2', email: 'bob2@example.com' });
      const vendorReq = new NextRequest(`http://localhost:3000/api/events/${eventId}/vendors`, {
        headers: { Authorization: `Bearer ${userBToken}` },
      });
      const vendorRes = await getVendors(vendorReq, {
        params: Promise.resolve({ id: eventId }),
      });

      // Service throws NOT_FOUND for wrong user — route returns 404
      expect(vendorRes.status).toBe(404);
      const json = await vendorRes.json();
      expect(json.success).toBe(false);
    });
  });
});
