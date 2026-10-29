import { GoogleGenAI } from '@google/genai';
import {
  StructuredPlanOutputSchema,
  StructuredPlanOutput,
  NormalizedPlanSuggestion,
} from './schemas';
import { buildSystemInstruction, buildUserPrompt, PromptContext } from './prompts';
import crypto from 'crypto';

export class GeminiConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeminiConfigurationError';
  }
}

export class GeminiGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeminiGenerationError';
  }
}

/**
 * Checks if the Gemini API key is configured server-side.
 */
export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);
}

/**
 * Gets configured model identifier.
 */
export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL || 'gemini-2.5-flash';
}

/**
 * Generates a structured event plan using Google Gemini via @google/genai.
 * Output is validated with Zod and normalized with deterministic financial calculations.
 */
export async function generateStructuredPlanWithGemini(
  ctx: PromptContext
): Promise<{ plan: NormalizedPlanSuggestion; modelUsed: string; durationMs: number }> {
  if (!isGeminiConfigured()) {
    throw new GeminiConfigurationError(
      'GEMINI_API_KEY is not configured on the server. Please add your Gemini API key to environment variables to enable AI planning.'
    );
  }

  const apiKey = process.env.GEMINI_API_KEY!;
  const modelName = getGeminiModel();
  const startTime = Date.now();

  const ai = new GoogleGenAI({ apiKey });
  const systemInstruction = buildSystemInstruction();
  const userPrompt = buildUserPrompt(ctx);

  let rawResponseText = '';

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: userPrompt,
      config: {
        responseMimeType: 'application/json',
        systemInstruction,
        temperature: 0.7,
      },
    });

    rawResponseText = response.text || '';
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    if (errMsg.includes('API key') || errMsg.includes('401') || errMsg.includes('unauthenticated')) {
      throw new GeminiGenerationError('Gemini authentication failed. Please verify your GEMINI_API_KEY.');
    }
    if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED')) {
      throw new GeminiGenerationError('Gemini rate limit exceeded. Please wait a moment before trying again.');
    }
    throw new GeminiGenerationError(`Gemini plan generation failed: ${errMsg}`);
  }

  if (!rawResponseText) {
    throw new GeminiGenerationError('Gemini returned an empty response.');
  }

  // Strip markdown code fences if model enclosed JSON
  const cleanedJson = rawResponseText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(cleanedJson);
  } catch {
    throw new GeminiGenerationError('Model output was not valid JSON.');
  }

  // Runtime schema validation
  const validationResult = StructuredPlanOutputSchema.safeParse(parsedJson);
  if (!validationResult.success) {
    const issues = validationResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
    throw new GeminiGenerationError(`Structured validation failed: ${issues}`);
  }

  const validatedPlan: StructuredPlanOutput = validationResult.data;
  const durationMs = Date.now() - startTime;

  // Deterministic financial normalization
  const totalBudgetPaise = ctx.totalBudgetRupees * 100;
  const normalizedPlan = normalizePlanProposal(validatedPlan, totalBudgetPaise, new Date(ctx.startDate));

  return {
    plan: normalizedPlan,
    modelUsed: modelName,
    durationMs,
  };
}

/**
 * Normalizes category percentages and computes exact integer paise allocations.
 * Guarantees that categories + contingency = total budget without 1-paisa drift.
 */
export function normalizePlanProposal(
  rawPlan: StructuredPlanOutput,
  totalBudgetPaise: number,
  eventStartDate: Date
): NormalizedPlanSuggestion {
  const contingencyPercentage = rawPlan.budgetPlan.contingencyPercentage || 10;
  const contingencyPaise = Math.floor((totalBudgetPaise * contingencyPercentage) / 100);
  const availableAllocationPaise = totalBudgetPaise - contingencyPaise;

  // Normalize category percentages to sum to 100% of available allocation pool
  const rawCategories = rawPlan.budgetPlan.categoryProposals;
  const rawSum = rawCategories.reduce((acc, c) => acc + c.percentage, 0);

  let remainingAvailable = availableAllocationPaise;
  const normalizedCategories: NormalizedPlanSuggestion['budgetPlan']['categories'] = [];

  for (let i = 0; i < rawCategories.length; i++) {
    const cat = rawCategories[i];
    const isLast = i === rawCategories.length - 1;

    // Scale percentage to sum to 100 if raw sum deviated
    const scaledPercent = rawSum > 0 ? Math.round((cat.percentage / rawSum) * 100) : 0;

    let allocatedPaise: number;
    if (isLast) {
      allocatedPaise = Math.max(0, remainingAvailable);
    } else {
      allocatedPaise = Math.floor((availableAllocationPaise * (rawSum > 0 ? cat.percentage / rawSum : 0)));
      remainingAvailable -= allocatedPaise;
    }

    normalizedCategories.push({
      id: `sug_cat_${crypto.randomUUID().slice(0, 8)}`,
      name: cat.name,
      percentage: scaledPercent,
      allocatedPaise,
      rationale: cat.rationale,
      isAccepted: true, // Selected by default for review
    });
  }

  // Compute tasks with deterministic due dates based on relativeDeadlineDays
  const normalizedTasks: NormalizedPlanSuggestion['tasks'] = rawPlan.tasks.map((task, idx) => {
    const dueDate = new Date(eventStartDate);
    dueDate.setDate(dueDate.getDate() - (task.relativeDeadlineDays || 7));

    return {
      id: `sug_tsk_${crypto.randomUUID().slice(0, 8)}_${idx}`,
      title: task.title,
      description: task.description,
      category: task.category,
      priority: task.priority,
      relativeDeadlineDays: task.relativeDeadlineDays,
      rationale: task.rationale,
      computedDueDateIso: dueDate.toISOString().split('T')[0],
      isAccepted: true, // Selected by default for review
    };
  });

  return {
    concept: rawPlan.concept,
    personalization: rawPlan.personalization,
    budgetPlan: {
      totalBudgetPaise,
      contingencyPercentage,
      contingencyPaise,
      availableAllocationPaise,
      categories: normalizedCategories,
    },
    tasks: normalizedTasks,
    agendaBlocks: rawPlan.agendaBlocks,
    vendorRequirements: rawPlan.vendorRequirements,
  };
}

