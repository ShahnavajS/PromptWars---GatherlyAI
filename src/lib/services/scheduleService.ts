import { getDb } from '@/lib/db';
import { eventSchedules, events } from '@/lib/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { CreateScheduleItemInput, UpdateScheduleItemInput } from '@/lib/validation/schedule';
import crypto from 'crypto';

export type ScheduleItem = typeof eventSchedules.$inferSelect;

export interface ConflictPair {
  item1: ScheduleItem;
  item2: ScheduleItem;
  reason: string;
}

/**
 * Verifies event ownership. Throws Error('NOT_FOUND') if event doesn't belong to user.
 */
async function verifyEventOwnership(eventId: string, userId: string): Promise<void> {
  const db = getDb();
  const result = db
    .select({ id: events.id })
    .from(events)
    .where(and(eq(events.id, eventId), eq(events.userId, userId)))
    .all();

  if (result.length === 0) {
    throw new Error('NOT_FOUND');
  }
}

/**
 * Converts HH:MM time string to minutes from midnight.
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Detects scheduling conflicts between items on the same day with overlapping time windows.
 * All-day items conflict with any same-day item.
 */
export function detectConflicts(items: ScheduleItem[]): ConflictPair[] {
  const conflicts: ConflictPair[] = [];

  // Group by date
  const byDate = new Map<string, ScheduleItem[]>();
  for (const item of items) {
    const existing = byDate.get(item.date) ?? [];
    existing.push(item);
    byDate.set(item.date, existing);
  }

  for (const [, dayItems] of byDate) {
    for (let i = 0; i < dayItems.length; i++) {
      for (let j = i + 1; j < dayItems.length; j++) {
        const a = dayItems[i];
        const b = dayItems[j];

        // All-day items conflict with everything on same day
        if (a.isAllDay || b.isAllDay) {
          conflicts.push({
            item1: a,
            item2: b,
            reason: 'All-day activity conflicts with another activity on the same day',
          });
          continue;
        }

        // Both timed: check for overlap
        if (a.startTime && a.endTime && b.startTime && b.endTime) {
          const aStart = timeToMinutes(a.startTime);
          const aEnd = timeToMinutes(a.endTime);
          const bStart = timeToMinutes(b.startTime);
          const bEnd = timeToMinutes(b.endTime);

          // Overlap if one starts before the other ends
          if (aStart < bEnd && bStart < aEnd) {
            conflicts.push({
              item1: a,
              item2: b,
              reason: `Time overlap: ${a.startTime}–${a.endTime} and ${b.startTime}–${b.endTime}`,
            });
          }
        }
      }
    }
  }

  return conflicts;
}

/**
 * Gets all schedule items for an event, ordered by date then sortOrder.
 */
export async function getScheduleItems(eventId: string, userId: string): Promise<ScheduleItem[]> {
  await verifyEventOwnership(eventId, userId);

  const db = getDb();
  return db
    .select()
    .from(eventSchedules)
    .where(eq(eventSchedules.eventId, eventId))
    .orderBy(asc(eventSchedules.date), asc(eventSchedules.sortOrder))
    .all();
}

/**
 * Creates a new schedule item for an event.
 */
export async function createScheduleItem(
  eventId: string,
  userId: string,
  input: CreateScheduleItemInput
): Promise<ScheduleItem> {
  await verifyEventOwnership(eventId, userId);

  const db = getDb();
  const now = new Date().toISOString();
  const id = `sch_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;

  db.insert(eventSchedules)
    .values({
      id,
      eventId,
      dayNumber: input.dayNumber,
      date: input.date,
      title: input.title,
      description: input.description ?? null,
      startTime: input.startTime ?? null,
      endTime: input.endTime ?? null,
      isAllDay: input.isAllDay,
      location: input.location ?? null,
      sortOrder: input.sortOrder,
      status: 'PLANNED',
      isAiSuggested: false,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  const created = db
    .select()
    .from(eventSchedules)
    .where(eq(eventSchedules.id, id))
    .all();

  return created[0];
}

/**
 * Updates a schedule item.
 */
export async function updateScheduleItem(
  eventId: string,
  userId: string,
  itemId: string,
  input: UpdateScheduleItemInput
): Promise<ScheduleItem> {
  await verifyEventOwnership(eventId, userId);

  const db = getDb();
  const now = new Date().toISOString();

  const existing = db
    .select()
    .from(eventSchedules)
    .where(and(eq(eventSchedules.id, itemId), eq(eventSchedules.eventId, eventId)))
    .all();

  if (existing.length === 0) {
    throw new Error('NOT_FOUND');
  }

  db.update(eventSchedules)
    .set({
      ...(input.dayNumber !== undefined ? { dayNumber: input.dayNumber } : {}),
      ...(input.date !== undefined ? { date: input.date } : {}),
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description ?? null } : {}),
      ...(input.startTime !== undefined ? { startTime: input.startTime ?? null } : {}),
      ...(input.endTime !== undefined ? { endTime: input.endTime ?? null } : {}),
      ...(input.isAllDay !== undefined ? { isAllDay: input.isAllDay } : {}),
      ...(input.location !== undefined ? { location: input.location ?? null } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      updatedAt: now,
    })
    .where(and(eq(eventSchedules.id, itemId), eq(eventSchedules.eventId, eventId)))
    .run();

  const updated = db
    .select()
    .from(eventSchedules)
    .where(eq(eventSchedules.id, itemId))
    .all();

  return updated[0];
}

/**
 * Deletes a schedule item.
 */
export async function deleteScheduleItem(
  eventId: string,
  userId: string,
  itemId: string
): Promise<void> {
  await verifyEventOwnership(eventId, userId);

  const db = getDb();

  const existing = db
    .select()
    .from(eventSchedules)
    .where(and(eq(eventSchedules.id, itemId), eq(eventSchedules.eventId, eventId)))
    .all();

  if (existing.length === 0) {
    throw new Error('NOT_FOUND');
  }

  db.delete(eventSchedules)
    .where(and(eq(eventSchedules.id, itemId), eq(eventSchedules.eventId, eventId)))
    .run();
}

