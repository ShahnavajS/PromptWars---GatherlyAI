import { z } from 'zod';

export const VendorCategoryEnum = z.enum([
  'VENUE', 'CATERING', 'DECOR', 'PHOTOGRAPHY', 'ENTERTAINMENT',
  'TRANSPORTATION', 'INVITATIONS', 'GENERAL'
]);

export const CreateVendorSchema = z.object({
  name: z.string().trim().min(2).max(150),
  category: VendorCategoryEnum,
  contactName: z.string().trim().max(100).optional().nullable(),
  contactPhone: z.string().trim().max(20).optional().nullable(),
  contactEmail: z.string().email().optional().nullable().or(z.literal('')),
  website: z.string().url().optional().nullable().or(z.literal('')),
  city: z.string().trim().max(100).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export const UpdateVendorSchema = CreateVendorSchema.partial();

export const CreateQuoteSchema = z.object({
  vendorId: z.string().trim().min(5),
  quoteTitle: z.string().trim().min(2).max(150),
  quotedAmountPaise: z.number().int().min(0),
  quoteDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  validUntilDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  inclusions: z.array(z.string().trim().max(200)).default([]),
  exclusions: z.array(z.string().trim().max(200)).default([]),
  paymentTerms: z.object({
    advancePercentage: z.number().int().min(0).max(100).optional(),
    milestones: z.array(z.object({
      description: z.string().trim().max(200),
      percentage: z.number().int().min(1).max(100),
    })).optional().default([]),
  }).optional(),
  cancellationPolicy: z.string().trim().max(500).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
  categoryId: z.string().optional().nullable(), // budget category linkage
});

export const ConfirmQuoteSchema = z.object({
  categoryId: z.string().trim().min(5), // budget category to update
});

export type CreateVendorInput = z.input<typeof CreateVendorSchema>;
export type UpdateVendorInput = z.input<typeof UpdateVendorSchema>;
export type CreateQuoteInput = z.input<typeof CreateQuoteSchema>;
export type ConfirmQuoteInput = z.input<typeof ConfirmQuoteSchema>;

