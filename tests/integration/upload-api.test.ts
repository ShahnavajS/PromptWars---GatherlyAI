import { beforeEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/events/[id]/quotes/extract-document/route';
import { createEvent } from '@/lib/services/eventService';
import { getRawSqlite } from '@/lib/db';
import { testSession } from '../helpers/auth';

describe('quotation upload route', () => {
  beforeEach(() => { getRawSqlite().exec('DELETE FROM events; DELETE FROM request_limits;'); });

  it('rejects an oversized multipart request before reading the body', async () => {
    const token = testSession({ id: 'usr_demo', name: 'Test Organizer', email: 'test-organizer@example.com' });
    const event = await createEvent({
      title: 'Upload Test Wedding', eventType: 'WEDDING', startDate: '2026-11-20',
      venueCity: 'Pune', targetGuestCount: 100, totalBudgetRupees: 100000,
    });
    const req = new NextRequest(`http://localhost:3000/api/events/${event.event.id}/quotes/extract-document`, {
      method: 'POST',
      headers: { 'content-type': 'multipart/form-data; boundary=test', 'content-length': String(6 * 1024 * 1024), authorization: `Bearer ${token}` },
    });
    const result = await POST(req, { params: Promise.resolve({ id: event.event.id }) });
    expect(result.status).toBe(413);
  });
});
