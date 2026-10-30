import { z } from 'zod';

/**
 * Category proposal in AI plan
 */
export const AiCategoryProposalSchema = z.object({
  name: z.string().trim().min(2).max(100),
  percentage: z.number().int().min(1).max(100),
  rationale: z.string().trim().min(5).max(300),
});

/**
 * Task proposal in AI plan
 */
export const AiTaskProposalSchema = z.object({
  title: z.string().trim().min(5).max(150),
  description: z.string().trim().max(500).default(''),
  category: z.enum(['VENUE', 'CATERING', 'DECOR', 'LOGISTICS', 'GENERAL', 'ENTERTAINMENT']).default('GENERAL'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  relativeDeadlineDays: z.number().int().default(7),
  rationale: z.string().trim().max(300).default(''),
});

/**
 * Optional schedule block for multi-day events
 */
export const AiAgendaBlockSchema = z.object({
  dayNumber: z.number().int().min(1).max(10),
  title: z.string().trim().min(3).max(120),
  timeWindow: z.string().trim().max(50),
  description: z.string().trim().max(400),
});

/**
 * Vendor requirement specification
 */
export const AiVendorRequirementSchema = z.object({
  category: z.string().trim().min(2).max(50),
  title: z.string().trim().min(3).max(120),
  specifications: z.string().trim().min(5).max(500),
  comparisonCriteria: z.array(z.string().trim().max(150)).default([]),
});

/**
 * Complete Structured Event Plan Schema
 */
export const StructuredPlanOutputSchema = z.object({
  // A. Event Concept
  concept: z.object({
    planTitle: z.string().trim().min(3).max(120),
    overview: z.string().trim().min(10).max(600),
    theme: z.string().trim().min(3).max(100),
    atmosphere: z.string().trim().min(3).max(150),
    keyAssumptions: z.array(z.string().trim().max(200)).default([]),
    missingInformation: z.array(z.string().trim().max(200)).default([]),
  }),

  // B. Personalization
  personalization: z.object({
    culturalTraditions: z.array(z.string().trim().max(150)).default([]),
    dietaryPlans: z.array(z.string().trim().max(150)).default([]),
    accessibilityNotes: z.array(z.string().trim().max(150)).default([]),
    decorAndColors: z.array(z.string().trim().max(150)).default([]),
    entertainmentIdeas: z.array(z.string().trim().max(150)).default([]),
  }),

  // C. Proposed Budget Allocations (Proportions of available pool)
  budgetPlan: z.object({
    contingencyPercentage: z.number().int().min(5).max(30).default(10),
    categoryProposals: z.array(AiCategoryProposalSchema).min(3).max(10),
  }),

  // D. Proposed Preparation Tasks
  tasks: z.array(AiTaskProposalSchema).min(3).max(20),

  // E. Optional Agenda Blocks
  agendaBlocks: z.array(AiAgendaBlockSchema).default([]),

  // F. Vendor Requirements
  vendorRequirements: z.array(AiVendorRequirementSchema).default([]),
});

export type StructuredPlanOutput = z.infer<typeof StructuredPlanOutputSchema>;

/**
 * Normalized Plan Proposal ready for User Review
 * Includes deterministically calculated integer paise amounts
 */
export interface NormalizedPlanSuggestion {
  concept: StructuredPlanOutput['concept'];
  personalization: StructuredPlanOutput['personalization'];
  budgetPlan: {
    totalBudgetPaise: number;
    contingencyPercentage: number;
    contingencyPaise: number;
    availableAllocationPaise: number;
    categories: Array<{
      id: string; // generated candidate id
      name: string;
      percentage: number;
      allocatedPaise: number;
      rationale: string;
      isAccepted: boolean;
    }>;
  };
  tasks: Array<
    z.infer<typeof AiTaskProposalSchema> & {
      id: string; // generated candidate id
      computedDueDateIso: string;
      isAccepted: boolean;
    }
  >;
  agendaBlocks: StructuredPlanOutput['agendaBlocks'];
  vendorRequirements: StructuredPlanOutput['vendorRequirements'];
}

/**
 * Request payload for generating an AI plan
 */
export const GeneratePlanRequestSchema = z.object({
  eventId: z.string().trim().min(5),
  additionalContext: z.string().trim().max(2000).default(''),
  culturalTraditionOverride: z.string().trim().max(100).optional(),
  dietaryPreferenceOverride: z.string().trim().max(100).optional(),
});

export type GeneratePlanRequest = z.infer<typeof GeneratePlanRequestSchema>;

/**
 * Request payload for accepting/rejecting suggestions
 */
export const ReviewActionSchema = z.object({
  action: z.enum(['ACCEPT_ALL', 'ACCEPT_SELECTED', 'REJECT_ALL']),
  selectedCategoryNames: z.array(z.string()).optional(),
  selectedTaskIds: z.array(z.string()).optional(),
  selectedAgendaIndices: z.array(z.number().int().nonnegative()).optional(),
  selectedVendorIndices: z.array(z.number().int().nonnegative()).optional(),
});

export type ReviewActionInput = z.infer<typeof ReviewActionSchema>;

