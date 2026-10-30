import { readJsonBody, jsonBodyErrorResponse } from '@/lib/api/jsonBody';
import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { getCurrentSessionUser, UnauthorizedSessionError } from '@/lib/auth/session';
import { getDb } from '@/lib/db';
import { events, vendorRequirements } from '@/lib/db/schema';

const UpdateRequirement = z.object({
  requirementId: z.string().min(1),
  status: z.enum(['OPEN', 'QUOTES_RECEIVED', 'AWARDED', 'CANCELLED']),
});

function ownedEvent(id: string, userId: string) {
  return getDb().select({ id: events.id }).from(events)
    .where(and(eq(events.id, id), eq(events.userId, userId))).get();
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getCurrentSessionUser(req);
    const { id } = await params;
    if (!ownedEvent(id, user.id)) return NextResponse.json({ success: false, error: 'Event not found.' }, { status: 404 });
    const data = getDb().select().from(vendorRequirements).where(eq(vendorRequirements.eventId, id)).all();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const status = error instanceof UnauthorizedSessionError ? 401 : 500;
    return NextResponse.json({ success: false, error: 'Could not load vendor requirements.' }, { status });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getCurrentSessionUser(req);
    const { id } = await params;
    if (!ownedEvent(id, user.id)) return NextResponse.json({ success: false, error: 'Event not found.' }, { status: 404 });
    const input = UpdateRequirement.parse(await readJsonBody(req));
    const changed = getDb().update(vendorRequirements).set({ status: input.status, updatedAt: new Date().toISOString() })
      .where(and(eq(vendorRequirements.id, input.requirementId), eq(vendorRequirements.eventId, id))).run();
    if (!changed.changes) return NextResponse.json({ success: false, error: 'Requirement not found.' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    const bodyError = jsonBodyErrorResponse(error);
    if (bodyError) return bodyError;
    const status = error instanceof UnauthorizedSessionError ? 401 : error instanceof z.ZodError ? 400 : 500;
    return NextResponse.json({ success: false, error: 'Could not update vendor requirement.' }, { status });
  }
}
