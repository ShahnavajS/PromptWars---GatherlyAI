import { z } from 'zod';
import { isIsoDate } from '@/lib/validation/date';

export const ChangeTypeEnum = z.enum([
  'GUEST_COUNT',
  'EVENT_DATE',
  'TOTAL_BUDGET',
  'VENUE',
  'MULTI_FIELD',
]);
export type ChangeType = z.infer<typeof ChangeTypeEnum>;

export const FindingSeverityEnum = z.enum(['INFO', 'WARNING', 'CRITICAL']);
export type FindingSeverity = z.infer<typeof FindingSeverityEnum>;

export const FindingClassificationEnum = z.enum([
  'CALCULATED_CHANGE',
  'NEEDS_REVIEW',
  'CONSTRAINT_VIOLATION',
  'INFO',
]);
export type FindingClassification = z.infer<typeof FindingClassificationEnum>;

export const AdjustCategoryActionSchema = z.object({
  id: z.string(),
  type: z.literal('ADJUST_CATEGORY_ALLOCATION'),
  categoryId: z.string(),
  categoryName: z.string(),
  currentPaise: z.number().int(),
  proposedPaise: z.number().int(),
  deltaPaise: z.number().int(),
  rationale: z.string(),
});
export type AdjustCategoryAction = z.infer<typeof AdjustCategoryActionSchema>;

export const ShiftTaskDueDateActionSchema = z.object({
  id: z.string(),
  type: z.literal('SHIFT_TASK_DUE_DATE'),
  taskId: z.string(),
  taskTitle: z.string(),
  currentDueDate: z.string().nullable(),
  proposedDueDate: z.string(),
  shiftDays: z.number().int(),
  rationale: z.string(),
});
export type ShiftTaskDueDateAction = z.infer<typeof ShiftTaskDueDateActionSchema>;

export const ProposedSideEffectActionSchema = z.discriminatedUnion('type', [
  AdjustCategoryActionSchema,
  ShiftTaskDueDateActionSchema,
]);
export type ProposedSideEffectAction = z.infer<typeof ProposedSideEffectActionSchema>;

export const ImpactFindingSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  changeType: ChangeTypeEnum,
  entityType: z.enum([
    'BUDGET_CATEGORY',
    'EVENT_TASK',
    'EVENT_BUDGET',
    'VENUE',
    'SCHEDULE',
    'GENERAL',
  ]),
  entityId: z.string(),
  title: z.string(),
  reason: z.string(),
  severity: FindingSeverityEnum,
  classification: FindingClassificationEnum,
  previousValue: z.string().nullable(),
  proposedValue: z.string().nullable(),
  requiredUserAction: z.string(),
  automaticChangeAllowed: z.boolean(),
  ruleId: z.string(),
  proposedAction: ProposedSideEffectActionSchema.optional().nullable(),
});
export type ImpactFinding = z.infer<typeof ImpactFindingSchema>;

export const ProposedChangesSchema = z
  .object({
    targetGuestCount: z
      .number()
      .int('Guest count must be an integer.')
      .min(1, 'Guest count must be at least 1.')
      .max(50000, 'Guest count cannot exceed 50,000.')
      .optional(),
    startDate: z
      .string()
      .refine(isIsoDate, 'Start date must be a real date in YYYY-MM-DD format.')
      .optional(),
    endDate: z
      .string()
      .refine(isIsoDate, 'End date must be a real date in YYYY-MM-DD format.')
      .optional()
      .nullable(),
    totalBudgetRupees: z
      .number()
      .int('Budget must be an integer in Rupees.')
      .min(1000, 'Minimum budget is ₹1,000.')
      .max(1000000000, 'Maximum budget is ₹100 Crore.')
      .optional(),
    venueName: z.string().trim().max(100).optional().nullable(),
    venueCity: z.string().trim().min(2).max(100).optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.endDate >= data.startDate;
      }
      return true;
    },
    {
      message: 'End date must be on or after start date.',
      path: ['endDate'],
    }
  );
export type ProposedChanges = z.infer<typeof ProposedChangesSchema>;

export const ChangePreviewRequestSchema = z.object({
  changeType: ChangeTypeEnum,
  proposedChanges: ProposedChangesSchema,
});
export type ChangePreviewRequest = z.infer<typeof ChangePreviewRequestSchema>;

export const ChangeConfirmRequestSchema = z.object({
  previewId: z.string(),
  sourceVersion: z.number().int().min(1),
  changeType: ChangeTypeEnum,
  proposedChanges: ProposedChangesSchema,
  approvedActionIds: z.array(z.string()).optional().default([]),
});
export type ChangeConfirmRequest = z.input<typeof ChangeConfirmRequestSchema>;

export interface ImpactPreviewResult {
  previewId: string;
  eventId: string;
  sourceVersion: number;
  changeType: ChangeType;
  currentValues: {
    targetGuestCount: number;
    startDate: string;
    endDate: string | null;
    totalBudgetPaise: number;
    venueName: string | null;
    venueCity: string;
  };
  proposedValues: {
    targetGuestCount: number;
    startDate: string;
    endDate: string | null;
    totalBudgetPaise: number;
    venueName: string | null;
    venueCity: string;
  };
  findings: ImpactFinding[];
  summary: {
    totalFindings: number;
    calculatedCount: number;
    reviewCount: number;
    criticalCount: number;
  };
  createdAt: string;
}
