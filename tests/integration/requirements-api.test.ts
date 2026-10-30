import { beforeEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PATCH } from '@/app/api/events/[id]/requirements/route';
import { testSession } from '../helpers/auth';
import { createEvent } from '@/lib/services/eventService';
import { getRawSqlite } from '@/lib/db';

describe('vendor requirement checklist API', () => {
  beforeEach(() => {
    getRawSqlite().exec('DELETE FROM events;');
  });

  it('lists and updates only requirements of an owned event', async () => {
    const owner = 'usr_requirements_owner';
    const event = await createEvent({
      title: 'Community Fair', eventType: 'COMMUNITY', startDate: '2026-12-05',
      venueCity: 'Pune', targetGuestCount: 250, totalBudgetRupees: 300000,
    }, owner);
    const sqlite = getRawSqlite();
    sqlite.prepare('INSERT INTO vendor_requirements (id, event_id, category, title, specifications, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run('req_1', event.event.id, 'VENUE', 'Accessible venue', 'Step-free access', '2026-10-01', '2026-10-01');
    const token = testSession({ id: owner, name: 'Owner', email: 'owner@example.com' });
    const attacker = testSession({ id: 'usr_attacker', name: 'Other', email: 'other@example.com' });
    const url = `http://localhost:3000/api/events/${event.event.id}/requirements`;
    const params = { params: Promise.resolve({ id: event.event.id }) };

    const denied = await GET(new NextRequest(url, { headers: { authorization: `Bearer ${attacker}` } }), params);
    expect(denied.status).toBe(404);
    const listed = await GET(new NextRequest(url, { headers: { authorization: `Bearer ${token}` } }), params);
    expect((await listed.json()).data).toHaveLength(1);

    const changed = await PATCH(new NextRequest(url, {
      method: 'PATCH', headers: { authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requirementId: 'req_1', status: 'AWARDED' }),
    }), params);
    expect(changed.status).toBe(200);
    expect((sqlite.prepare('SELECT status FROM vendor_requirements WHERE id = ?').get('req_1') as { status: string }).status).toBe('AWARDED');
  });
});
