import { z } from 'zod';

export const EventTypeEnum = z.enum(['WEDDING', 'BIRTHDAY', 'COMMUNITY', 'CELEBRATION']);
export type EventType = z.infer<typeof EventTypeEnum>;

export const TaskStatusEnum = z.enum(['TODO', 'IN_PROGRESS', 'DONE']);
export type TaskStatus = z.infer<typeof TaskStatusEnum>;

export const TaskPriorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export type TaskPriority = z.infer<typeof TaskPriorityEnum>;

/**
 * Schema for creating a new event
 */
export const CreateEventSchema = z
  .object({
    title: z
      .string({ required_error: 'Event title is required.' })
      .trim()
      .min(3, 'Event title must be at least 3 characters.')
      .max(100, 'Event title cannot exceed 100 characters.'),
    eventType: EventTypeEnum,
    startDate: z
      .string({ required_error: 'Start date is required.' })
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format.'),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format.')
      .optional()
      .nullable(),
    venueCity: z
      .string()
      .trim()
      .min(2, 'City must be at least 2 characters.')
      .max(100, 'City cannot exceed 100 characters.')
      .default('Ahmedabad'),
    venueName: z.string().trim().max(100).optional().nullable(),
    targetGuestCount: z
      .number({ required_error: 'Guest count is required.' })
      .int('Guest count must be an integer.')
      .min(1, 'Guest count must be at least 1.')
      .max(50000, 'Guest count cannot exceed 50,000 guests.'),
    totalBudgetRupees: z
      .number({ required_error: 'Total budget in INR is required.' })
      .int('Budget must be a whole number of Rupees.')
      .min(1000, 'Minimum budget is ₹1,000.')
      .max(1000000000, 'Maximum budget is ₹100 Crore.'),
    timezone: z.string().optional().default('Asia/Kolkata'),
    culturalPreset: z.enum(['GUJARATI', 'PUNJABI', 'SOUTH_INDIAN', 'BENGALI', 'MODERN', 'COMMUNITY']).optional(),
    dietaryPreference: z.enum(['PURE_VEG', 'JAIN_AVAILABLE', 'VEGAN', 'HALAL', 'MIXED']).optional(),
  })
  .refine(
    (data) => {
      if (!data.endDate) return true;
      return new Date(data.endDate) >= new Date(data.startDate);
    },
    {
      message: 'End date must be on or after start date.',
      path: ['endDate'],
    }
  );

export type CreateEventInput = z.input<typeof CreateEventSchema>;

/**
 * Schema for updating a category allocation
 */
export const UpdateCategoryAllocationSchema = z.object({
  allocatedPaise: z
    .number({ required_error: 'Allocated paise amount is required.' })
    .int('Amount must be a whole integer in paise.')
    .min(0, 'Allocation cannot be negative.')
    .max(Number.MAX_SAFE_INTEGER, 'Allocation exceeds maximum safe limit.'),
});

export type UpdateCategoryAllocationInput = z.infer<typeof UpdateCategoryAllocationSchema>;

/**
 * Schema for toggling or updating a task
 */
export const UpdateTaskSchema = z.object({
  status: TaskStatusEnum.optional(),
  title: z.string().trim().min(2).max(150).optional(),
  priority: TaskPriorityEnum.optional(),
  assignedTo: z.string().trim().max(100).optional().nullable(),
});

export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;
