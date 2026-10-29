import { z } from 'zod';

export const CreateScheduleItemSchema = z.object({
  dayNumber: z.number().int().min(1).max(30),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string().trim().min(2).max(150),
  description: z.string().trim().max(500).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  isAllDay: z.boolean().default(false),
  location: z.string().trim().max(150).optional().nullable(),
  sortOrder: z.number().int().default(0),
});

export const UpdateScheduleItemSchema = CreateScheduleItemSchema.partial();

export type CreateScheduleItemInput = z.infer<typeof CreateScheduleItemSchema>;
export type UpdateScheduleItemInput = z.infer<typeof UpdateScheduleItemSchema>;

