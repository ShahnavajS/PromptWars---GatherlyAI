import { z } from 'zod';
import { isIsoDate, isClockTime } from './date';

const ScheduleFields = z.object({
  dayNumber: z.number().int().min(1).max(30),
  date: z.string().refine(isIsoDate, 'Enter a real date.'),
  title: z.string().trim().min(2).max(150),
  description: z.string().trim().max(500).optional(),
  startTime: z.string().refine(isClockTime, 'Enter a time from 00:00 to 23:59.').optional().nullable(),
  endTime: z.string().refine(isClockTime, 'Enter a time from 00:00 to 23:59.').optional().nullable(),
  isAllDay: z.boolean().default(false),
  location: z.string().trim().max(150).optional().nullable(),
  sortOrder: z.number().int().default(0),
});

export const CreateScheduleItemSchema = ScheduleFields.refine((item) => !item.startTime || !item.endTime || item.endTime > item.startTime, {
  message: 'End time must be after start time.', path: ['endTime'],
});

export const UpdateScheduleItemSchema = ScheduleFields.partial().refine(
  (item) => !item.startTime || !item.endTime || item.endTime > item.startTime,
  { message: 'End time must be after start time.', path: ['endTime'] }
);

export type CreateScheduleItemInput = z.infer<typeof CreateScheduleItemSchema>;
export type UpdateScheduleItemInput = z.infer<typeof UpdateScheduleItemSchema>;

