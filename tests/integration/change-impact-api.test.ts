import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as postPreview } from '@/app/api/events/[id]/change-impact/preview/route';
import { POST as postConfirm } from '@/app/api/events/[id]/change-impact/confirm/route';
import { GET as getHistory } from '@/app/api/events/[id]/history/route';
import { createEvent } from '@/lib/services/eventService';
import { getRawSqlite } from '@/lib/db';

describe('Change-Impact API Routes Integration', () => {
  beforeEach(() => {
    const rawSqlite = getRawSqlite();
    rawSqlite.exec(`
      DELETE FROM event_activities;
      DELETE FROM ai_plan_suggestions;
      DELETE FROM event_tasks;
      DELETE FROM budget_categories;
      DELETE FROM event_budgets;
      DELETE FROM events;
    `);
  });

  describe('POST /api/events/[id]/change-impact/preview', () => {
    it('returns 200 with explainable preview findings', async () => {
      const detail = await createEvent({
        title: 'API Preview Wedding',
        eventType: 'WEDDING',
        startDate: '2026-11-20',
        venueCity: 'Ahmedabad',
        targetGuestCount: 200,
        totalBudgetRupees: 1200000,
      });

      const req = new NextRequest(
        `http://localhost:3000/api/events/${detail.event.id}/change-impact/preview`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            changeType: 'GUEST_COUNT',
            proposedChanges: { targetGuestCount: 300 },
          }),
        }
      );

      const res = await postPreview(req, { params: Promise.resolve({ id: detail.event.id }) });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.preview.findings.length).toBeGreaterThan(0);
      expect(json.preview.proposedValues.targetGuestCount).toBe(300);
    });

    it('returns 400 when proposed payload violates schema (e.g. negative guests)', async () => {
      const detail = await createEvent({
        title: 'Schema Test Wedding',
        eventType: 'WEDDING',
        startDate: '2026-11-20',
        venueCity: 'Ahmedabad',
        targetGuestCount: 200,
        totalBudgetRupees: 1200000,
      });

      const req = new NextRequest(
        `http://localhost:3000/api/events/${detail.event.id}/change-impact/preview`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            changeType: 'GUEST_COUNT',
            proposedChanges: { targetGuestCount: -50 }, // Invalid!
          }),
        }
      );

      const res = await postPreview(req, { params: Promise.resolve({ id: detail.event.id }) });
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('targetGuestCount');
    });

    it('returns 404 when event ID is not found', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/events/evt_nonexistent/change-impact/preview',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            changeType: 'GUEST_COUNT',
            proposedChanges: { targetGuestCount: 250 },
          }),
        }
      );

      const res = await postPreview(req, {
        params: Promise.resolve({ id: 'evt_nonexistent' }),
      });
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/events/[id]/change-impact/confirm', () => {
    it('returns 200 and persists updates atomically', async () => {
      const detail = await createEvent({
        title: 'Confirm API Wedding',
        eventType: 'WEDDING',
        startDate: '2026-11-20',
        venueCity: 'Ahmedabad',
        targetGuestCount: 200,
        totalBudgetRupees: 1200000,
      });

      const confirmReq = new NextRequest(
        `http://localhost:3000/api/events/${detail.event.id}/change-impact/confirm`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            previewId: 'prv_123',
            sourceVersion: 1,
            changeType: 'GUEST_COUNT',
            proposedChanges: { targetGuestCount: 280 },
            approvedActionIds: [],
          }),
        }
      );

      const res = await postConfirm(confirmReq, {
        params: Promise.resolve({ id: detail.event.id }),
      });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.event.event.targetGuestCount).toBe(280);
      expect(json.data.event.event.version).toBe(2);
    });

    it('returns 409 Conflict when sourceVersion does not match current event version', async () => {
      const detail = await createEvent({
        title: 'Stale Version Event',
        eventType: 'WEDDING',
        startDate: '2026-11-20',
        venueCity: 'Ahmedabad',
        targetGuestCount: 200,
        totalBudgetRupees: 1200000,
      });

      // Submit confirm with obsolete version
      const confirmReq = new NextRequest(
        `http://localhost:3000/api/events/${detail.event.id}/change-impact/confirm`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            previewId: 'prv_obsolete',
            sourceVersion: 999, // Stale!
            changeType: 'GUEST_COUNT',
            proposedChanges: { targetGuestCount: 280 },
            approvedActionIds: [],
          }),
        }
      );

      const res = await postConfirm(confirmReq, {
        params: Promise.resolve({ id: detail.event.id }),
      });
      expect(res.status).toBe(409);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('modified');
    });
  });

  describe('GET /api/events/[id]/history', () => {
    it('returns 200 with chronological change activities', async () => {
      const detail = await createEvent({
        title: 'History Event',
        eventType: 'WEDDING',
        startDate: '2026-11-20',
        venueCity: 'Ahmedabad',
        targetGuestCount: 200,
        totalBudgetRupees: 1200000,
      });

      const req = new NextRequest(`http://localhost:3000/api/events/${detail.event.id}/history`);
      const res = await getHistory(req, {
        params: Promise.resolve({ id: detail.event.id }),
      });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.history)).toBe(true);
      expect(json.history.length).toBeGreaterThanOrEqual(1); // Contains initial creation activity
      expect(json.history[0].actionType).toBe('EVENT_CREATED');
    });
  });
});
