import { z } from 'zod';

export const UpdatePreferencesSchema = z.object({
  culturalPreset: z.enum(['GUJARATI', 'PUNJABI', 'SOUTH_INDIAN', 'BENGALI', 'MODERN', 'COMMUNITY']).optional(),
  dietaryPreference: z.enum(['PURE_VEG', 'JAIN_AVAILABLE', 'VEGAN', 'HALAL', 'MIXED']).optional(),
  accessibilityNotes: z.string().trim().max(500).optional().nullable(),
  decorStyle: z.string().trim().max(200).optional().nullable(),
  entertainmentStyle: z.string().trim().max(200).optional().nullable(),
  venueCapacityMax: z.number().int().positive().optional().nullable(),
});

export type UpdatePreferencesInput = z.infer<typeof UpdatePreferencesSchema>;

