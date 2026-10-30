import { cookies } from 'next/headers';
import HomeClient from './HomeClient';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth/session';
import { listEvents } from '@/lib/services/eventService';

export default async function HomePage() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = token ? verifySessionToken(token) : null;
  const events = session ? await listEvents(session.id) : [];
  return <HomeClient initialEvents={events} signedIn={Boolean(session)} />;
}
