import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth/session';
import { getEventById } from '@/lib/services/eventService';
import EventDashboardClient from './EventDashboardClient';

export default async function EventDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session) redirect(`/sign-in?next=${encodeURIComponent(`/events/${id}`)}`);
  const detail = await getEventById(id, session.id);
  if (!detail) notFound();
  return <EventDashboardClient eventId={id} initialData={detail} />;
}
