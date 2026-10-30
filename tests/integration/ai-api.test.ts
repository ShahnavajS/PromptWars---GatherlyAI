import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as postPlan, GET as getPlan } from '@/app/api/ai/plan/route';
import { POST as postReview } from '@/app/api/ai/plan/[suggestionId]/review/route';
import { createEvent } from '@/lib/services/eventService';
import { getRawSqlite } from '@/lib/db';
import { testSession } from '../helpers/auth';

describe('AI Planning API Routes Integration', () => {
  let token: string;
  beforeEach(() => {
    const rawSqlite = getRawSqlite();
    rawSqlite.exec(`
      DELETE FROM ai_plan_suggestions;
      DELETE FROM event_tasks;
      DELETE FROM budget_categories;
      DELETE FROM event_budgets;
      DELETE FROM events;
    `);
    token = testSession({ id: 'usr_demo', name: 'Test Organizer', email: 'test-organizer@example.com' });
  });

  describe('POST /api/ai/plan', () => {
    it('creates a staged reviewable plan proposal and returns 201', async () => {
      const eventDetail = await createEvent({
        title: 'API Test Wedding',
        eventType: 'WEDDING',
        startDate: '2026-11-20',
        venueCity: 'Ahmedabad',
        targetGuestCount: 200,
        totalBudgetRupees: 1200000,
      }, 'usr_demo');

      const req = new NextRequest('http://localhost:3000/api/ai/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          eventId: eventDetail.event.id,
          additionalContext: 'Include pure vegetarian and Jain food options.',
        }),
      });

      const res = await postPlan(req);
      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.suggestionId).toMatch(/^sug_/);
      expect(json.plan).toBeDefined();
      expect(json.plan.concept.planTitle).toBeDefined();
      expect(json.status).toBe('PENDING_REVIEW');
    });

    it('returns 404 when eventId does not exist', async () => {
      const req = new NextRequest('http://localhost:3000/api/ai/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          eventId: 'evt_does_not_exist',
          additionalContext: 'Notes',
        }),
      });

      const res = await postPlan(req);
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('not found');
    });

    it('returns 400 when request body is malformed or missing eventId', async () => {
      const req = new NextRequest('http://localhost:3000/api/ai/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          additionalContext: 'Missing event ID',
        }),
      });

      const res = await postPlan(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
    });
  });

  describe('GET /api/ai/plan?eventId=...', () => {
    it('uses the bearer identity to enforce plan ownership', async () => {
      const owner = 'usr_plan_owner';
      const event = await createEvent({
        title: 'Private Community Fair', eventType: 'COMMUNITY', startDate: '2026-12-05',
        venueCity: 'Pune', targetGuestCount: 300, totalBudgetRupees: 300000,
      }, owner);
      const url = `http://localhost:3000/api/ai/plan?eventId=${event.event.id}`;
      const ownerToken = testSession({ id: owner, name: 'Owner', email: 'owner@example.com' });
      const otherToken = testSession({ id: 'usr_other', name: 'Other', email: 'other@example.com' });
      const generated = await postPlan(new NextRequest('http://localhost:3000/api/ai/plan', {
        method: 'POST', headers: { authorization: `Bearer ${ownerToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: event.event.id, additionalContext: '' }),
      }));
      expect(generated.status).toBe(201);
      const response = await getPlan(new NextRequest(url, { headers: { authorization: `Bearer ${otherToken}` } }));
      expect((await response.json()).suggestion).toBeNull();
    });
    it('returns 400 when eventId parameter is missing', async () => {
      const req = new NextRequest('http://localhost:3000/api/ai/plan', { headers: { authorization: `Bearer ${token}` } });
      const res = await getPlan(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
    });

    it('returns 200 with latest suggestion when exists', async () => {
      const eventDetail = await createEvent({
        title: 'Fetch Test Birthday',
        eventType: 'BIRTHDAY',
        startDate: '2026-12-05',
        venueCity: 'Vadodara',
        targetGuestCount: 50,
        totalBudgetRupees: 150000,
      }, 'usr_demo');

      // Generate a plan
      const genReq = new NextRequest('http://localhost:3000/api/ai/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          eventId: eventDetail.event.id,
          additionalContext: 'Birthday party',
        }),
      });
      await postPlan(genReq);

      // Now query via GET
      const getReq = new NextRequest(
        `http://localhost:3000/api/ai/plan?eventId=${eventDetail.event.id}`,
        { headers: { authorization: `Bearer ${token}` } }
      );
      const getRes = await getPlan(getReq);
      expect(getRes.status).toBe(200);

      const json = await getRes.json();
      expect(json.success).toBe(true);
      expect(json.suggestion).not.toBeNull();
      expect(json.suggestion.eventId).toBe(eventDetail.event.id);
    });
  });

  describe('POST /api/ai/plan/[suggestionId]/review', () => {
    it('successfully processes ACCEPT_ALL action and returns 200', async () => {
      const eventDetail = await createEvent({
        title: 'Review Route Wedding',
        eventType: 'WEDDING',
        startDate: '2026-11-20',
        venueCity: 'Ahmedabad',
        targetGuestCount: 200,
        totalBudgetRupees: 1200000,
      }, 'usr_demo');

      const genReq = new NextRequest('http://localhost:3000/api/ai/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          eventId: eventDetail.event.id,
          additionalContext: 'Review test',
        }),
      });
      const genRes = await postPlan(genReq);
      const genJson = await genRes.json();
      const suggestionId = genJson.suggestionId;

      const reviewReq = new NextRequest(
        `http://localhost:3000/api/ai/plan/${suggestionId}/review?eventId=${eventDetail.event.id}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            action: 'ACCEPT_ALL',
          }),
        }
      );

      const reviewRes = await postReview(reviewReq, {
        params: Promise.resolve({ suggestionId }),
      });

      expect(reviewRes.status).toBe(200);
      const reviewJson = await reviewRes.json();
      expect(reviewJson.success).toBe(true);
      expect(reviewJson.data.appliedCategoriesCount).toBeGreaterThan(0);
      expect(reviewJson.data.appliedTasksCount).toBeGreaterThan(0);
    });

    it('returns 400 when eventId query param is missing', async () => {
      const reviewReq = new NextRequest('http://localhost:3000/api/ai/plan/sug_123/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'ACCEPT_ALL' }),
      });

      const res = await postReview(reviewReq, {
        params: Promise.resolve({ suggestionId: 'sug_123' }),
      });

      expect(res.status).toBe(400);
    });
  });
});

