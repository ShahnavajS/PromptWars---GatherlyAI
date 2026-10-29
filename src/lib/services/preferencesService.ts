import { getDb } from '@/lib/db';
import { eventPreferences, events } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { UpdatePreferencesInput } from '@/lib/validation/preferences';

export type EventPreferences = typeof eventPreferences.$inferSelect;

export const CULTURAL_PRESETS = {
  GUJARATI: {
    label: 'Gujarati Wedding',
    traditions: ['Garba & Dandiya Raas', 'Mehendi', 'Sangeet', 'Haldi', 'Vidai'],
    dietary: 'PURE_VEG',
    decor: 'Marigold flowers, vibrant orange and yellow, traditional mandap',
    entertainment: 'Garba night, folk music, dhol players',
  },
  PUNJABI: {
    label: 'Punjabi Wedding',
    traditions: ['Roka', 'Chunni Chadai', 'Sangeet', 'Mehendi', 'Chooda', 'Baraat'],
    dietary: 'MIXED',
    decor: 'Red and gold, phoolon ki chaddar, kaliras',
    entertainment: 'Bhangra, live dhol, Bollywood DJ',
  },
  SOUTH_INDIAN: {
    label: 'South Indian Wedding',
    traditions: ['Naandi', 'Nischitartham', 'Muhurtham', 'Saptapadi', 'Aashirvad'],
    dietary: 'PURE_VEG',
    decor: 'Jasmine flowers, banana leaves, kolam rangoli',
    entertainment: 'Carnatic music, nadaswaram, traditional dance',
  },
  BENGALI: {
    label: 'Bengali Wedding',
    traditions: ['Aiburo Bhaat', 'Gaye Holud', 'Shubho Drishti', 'Sampradaan'],
    dietary: 'MIXED',
    decor: 'White and red, shankha pola, dhak music',
    entertainment: 'Rabindra Sangeet, folk music',
  },
  MODERN: {
    label: 'Modern/Contemporary',
    traditions: [],
    dietary: 'MIXED',
    decor: 'Elegant, minimalist, fairy lights',
    entertainment: 'DJ, live band, photo booth',
  },
  COMMUNITY: {
    label: 'Community Event',
    traditions: [],
    dietary: 'MIXED',
    decor: 'Colorful, festive banners',
    entertainment: 'Cultural performances, games',
  },
} as const;

/**
 * Verifies event ownership. Throws Error('NOT_FOUND') if not found.
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
 * Gets event preferences (creates default if not existing).
 */
export async function getPreferences(
  eventId: string,
  userId: string
): Promise<EventPreferences | null> {
  await verifyEventOwnership(eventId, userId);

  const db = getDb();
  const prefList = db
    .select()
    .from(eventPreferences)
    .where(eq(eventPreferences.eventId, eventId))
    .all();

  return prefList.length > 0 ? prefList[0] : null;
}

/**
 * Updates event preferences.
 */
export async function updatePreferences(
  eventId: string,
  userId: string,
  input: UpdatePreferencesInput
): Promise<EventPreferences> {
  await verifyEventOwnership(eventId, userId);

  const db = getDb();
  const now = new Date().toISOString();

  const existing = db
    .select()
    .from(eventPreferences)
    .where(eq(eventPreferences.eventId, eventId))
    .all();

  if (existing.length === 0) {
    throw new Error('Preferences not found for this event.');
  }

  db.update(eventPreferences)
    .set({
      ...(input.culturalPreset !== undefined ? { culturalPreset: input.culturalPreset } : {}),
      ...(input.dietaryPreference !== undefined ? { dietaryPreference: input.dietaryPreference } : {}),
      ...(input.accessibilityNotes !== undefined ? { accessibilityNotes: input.accessibilityNotes ?? null } : {}),
      ...(input.decorStyle !== undefined ? { decorStyle: input.decorStyle ?? null } : {}),
      ...(input.entertainmentStyle !== undefined ? { entertainmentStyle: input.entertainmentStyle ?? null } : {}),
      ...(input.venueCapacityMax !== undefined ? { venueCapacityMax: input.venueCapacityMax ?? null } : {}),
      updatedAt: now,
    })
    .where(eq(eventPreferences.eventId, eventId))
    .run();

  const updated = db
    .select()
    .from(eventPreferences)
    .where(eq(eventPreferences.eventId, eventId))
    .all();

  return updated[0];
}

