import { beforeEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as signIn, GET as getSession, DELETE as signOut } from '@/app/api/auth/session/route';
import { getRawSqlite } from '@/lib/db';
import { GET as getEvent } from '@/app/api/events/[id]/route';
import { createEvent } from '@/lib/services/eventService';

describe('account-backed session API', () => {
  beforeEach(() => {
    getRawSqlite().exec('DELETE FROM users; DELETE FROM request_limits;');
  });

  function request(body: object, origin = 'http://localhost:3000') {
    return new NextRequest('http://localhost:3000/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: origin },
      body: JSON.stringify(body),
    });
  }

  it('registers and signs in only with the stored password', async () => {
    const registered = await signIn(request({
      mode: 'register', name: 'Organizer',
      email: 'Organizer@example.com', password: 'a strong password 123',
    }));
    expect(registered.status).toBe(200);
    const registration = await registered.json();
    expect(registration.data.id).toMatch(/^usr_/);
    expect(registration.data.id).not.toBe('usr_victim');
    expect(registration.data.email).toBe('organizer@example.com');
    expect(registered.cookies.get('gatherly_session')?.value).toBeTruthy();

    const wrong = await signIn(request({ email: 'organizer@example.com', password: 'wrong password 123' }));
    expect(wrong.status).toBe(401);

    const login = await signIn(request({ email: 'organizer@example.com', password: 'a strong password 123' }));
    expect(login.status).toBe(200);
    const cookie = login.cookies.get('gatherly_session')?.value;
    const session = await getSession(new NextRequest('http://localhost:3000/api/auth/session', {
      headers: { cookie: `gatherly_session=${cookie}` },
    }));
    expect((await session.json()).data.id).toBe(registration.data.id);
  });

  it('rejects cross-origin sign-in requests', async () => {
    const response = await signIn(request({ email: 'x@example.com', password: 'some password 123' }, 'https://other.example'));
    expect(response.status).toBe(403);
  });

  it('keeps anonymous users out and invalidates the cookie on sign out', async () => {
    const anonymous = await getSession(new NextRequest('http://localhost:3000/api/auth/session'));
    expect(anonymous.status).toBe(401);
    const login = await signIn(request({
      mode: 'register', name: 'Organizer', email: 'organizer@example.com', password: 'a strong password 123',
    }));
    const token = login.cookies.get('gatherly_session')?.value;
    expect(token).toBeTruthy();
    const logout = await signOut(new NextRequest('http://localhost:3000/api/auth/session', {
      method: 'DELETE', headers: { origin: 'http://localhost:3000', cookie: `gatherly_session=${token}` },
    }));
    expect(logout.status).toBe(200);
    const after = await getSession(new NextRequest('http://localhost:3000/api/auth/session', {
      headers: { cookie: `gatherly_session=${token}` },
    }));
    expect(after.status).toBe(401);
  });

  it('signs in to a separate example account without granting legacy demo event ownership', async () => {
    const legacy = await createEvent({
      title: 'Legacy Demo Wedding', eventType: 'WEDDING', startDate: '2026-11-20',
      venueCity: 'Ahmedabad', targetGuestCount: 50, totalBudgetRupees: 100000,
    }, 'usr_demo');
    const response = await signIn(request({
      mode: 'login', email: 'example@gatherly.demo', password: 'Gatherly-Example-2026!',
    }));
    expect(response.status).toBe(200);
    expect((await response.json()).data.id).toBe('usr_example');
    const token = response.cookies.get('gatherly_session')?.value;
    const privateEvent = await getEvent(new NextRequest(`http://localhost:3000/api/events/${legacy.event.id}`, {
      headers: { cookie: `gatherly_session=${token}` },
    }), { params: Promise.resolve({ id: legacy.event.id }) });
    expect(privateEvent.status).toBe(404);
  });

  it('rotates example credentials and revokes its older sessions', async () => {
    const oldPassword = process.env.EXAMPLE_ACCOUNT_PASSWORD;
    try {
      const first = await signIn(request({
        mode: 'login', email: 'example@gatherly.demo', password: 'Gatherly-Example-2026!',
      }));
      const oldToken = first.cookies.get('gatherly_session')?.value;
      process.env.EXAMPLE_ACCOUNT_PASSWORD = 'Gatherly-Example-Rotated-2026!';
      const second = await signIn(request({
        mode: 'login', email: 'example@gatherly.demo', password: 'Gatherly-Example-Rotated-2026!',
      }));
      expect(second.status).toBe(200);
      const oldSession = await getSession(new NextRequest('http://localhost:3000/api/auth/session', {
        headers: { cookie: `gatherly_session=${oldToken}` },
      }));
      expect(oldSession.status).toBe(401);
    } finally {
      if (oldPassword === undefined) delete process.env.EXAMPLE_ACCOUNT_PASSWORD;
      else process.env.EXAMPLE_ACCOUNT_PASSWORD = oldPassword;
    }
  });
});
