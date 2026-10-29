import { describe, it, expect, beforeEach } from 'vitest';
import {
  CULTURAL_PRESETS,
  getPreferences,
  updatePreferences,
} from '@/lib/services/preferencesService';
import { UpdatePreferencesSchema } from '@/lib/validation/preferences';
import { createEvent } from '@/lib/services/eventService';
import { getRawSqlite } from '@/lib/db';

describe('Cultural Customization & Regional Presets (Unit & Service)', () => {
  beforeEach(() => {
    const rawSqlite = getRawSqlite();
    rawSqlite.exec(`
      DELETE FROM event_preferences;
      DELETE FROM event_tasks;
      DELETE FROM budget_categories;
      DELETE FROM event_budgets;
      DELETE FROM events;
    `);
  });

  describe('CULTURAL_PRESETS Catalog', () => {
    it('defines rich cultural presets with authentic Indian traditions and dietary requirements', () => {
      const presets = Object.keys(CULTURAL_PRESETS);
      expect(presets).toContain('GUJARATI');
      expect(presets).toContain('PUNJABI');
      expect(presets).toContain('SOUTH_INDIAN');
      expect(presets).toContain('BENGALI');
      expect(presets).toContain('MODERN');
      expect(presets).toContain('COMMUNITY');

      const gujarati = CULTURAL_PRESETS.GUJARATI;
      expect(gujarati.label).toBe('Gujarati Wedding');
      expect(gujarati.traditions).toContain('Garba & Dandiya Raas');
      expect(gujarati.dietary).toBe('PURE_VEG');

      const southIndian = CULTURAL_PRESETS.SOUTH_INDIAN;
      expect(southIndian.label).toBe('South Indian Wedding');
      expect(southIndian.traditions).toContain('Muhurtham');
    });
  });

  describe('UpdatePreferencesSchema runtime validation', () => {
    it('accepts valid cultural and dietary options', () => {
      const valid = UpdatePreferencesSchema.safeParse({
        culturalPreset: 'GUJARATI',
        dietaryPreference: 'JAIN_AVAILABLE',
        accessibilityNotes: 'Wheelchair access required for elderly grandparents',
        venueCapacityMax: 500,
      });
      expect(valid.success).toBe(true);
    });

    it('rejects unsupported cultural presets', () => {
      const invalid = UpdatePreferencesSchema.safeParse({
        culturalPreset: 'UNSUPPORTED_PRESET' as unknown,
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe('Preferences Service Database Operations', () => {
    it('fetches initial preferences seeded during event creation and persists updates', async () => {
      const detail = await createEvent(
        {
          title: 'Cultural Test Celebration',
          eventType: 'WEDDING',
          startDate: '2026-11-20',
          venueCity: 'Vadodara',
          targetGuestCount: 300,
          totalBudgetRupees: 2000000,
        },
        'usr_cultural_test'
      );

      const eventId = detail.event.id;
      const userId = 'usr_cultural_test';

      // 1. Initial preferences seeded automatically
      const initialPrefs = await getPreferences(eventId, userId);
      expect(initialPrefs).not.toBeNull();
      expect(initialPrefs?.culturalPreset).toBe('GUJARATI'); // seeded default for WEDDING in Gujarat

      // 2. Update preferences
      const updated = await updatePreferences(eventId, userId, {
        culturalPreset: 'PUNJABI',
        dietaryPreference: 'MIXED',
        accessibilityNotes: 'Ramp needed for mandap access; ground floor seating reserved for elders',
        decorStyle: 'Royal Red, Gold & Marigold Floral Chaddar',
        entertainmentStyle: 'Live Dhol & Sangeet Performance',
        venueCapacityMax: 350,
      });

      expect(updated.culturalPreset).toBe('PUNJABI');
      expect(updated.dietaryPreference).toBe('MIXED');
      expect(updated.venueCapacityMax).toBe(350);
      expect(updated.accessibilityNotes).toContain('Ramp needed');

      // 3. Verify retrieved preferences match updated values
      const refetched = await getPreferences(eventId, userId);
      expect(refetched?.culturalPreset).toBe('PUNJABI');
      expect(refetched?.venueCapacityMax).toBe(350);

      // 4. Cross-user isolation
      await expect(
        getPreferences(eventId, 'usr_unauthorized')
      ).rejects.toThrow('NOT_FOUND');

      await expect(
        updatePreferences(eventId, 'usr_unauthorized', { culturalPreset: 'MODERN' })
      ).rejects.toThrow('NOT_FOUND');
    });
  });
});

