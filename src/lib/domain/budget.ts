/**
 * Gatherly AI — Deterministic Financial & Budget Domain Engine
 *
 * Core Principle: 100% deterministic arithmetic in integer minor units (paise).
 * ₹1 = 100 paise. ₹12,00,000 = 120,000,000 paise.
 * Zero floating-point arithmetic.
 */

export interface BudgetCategoryItem {
  id: string;
  name: string;
  allocatedPaise: number;
  estimatedPaise?: number;
}

export interface BudgetSummary {
  totalBudgetPaise: number;
  allocatedTotalPaise: number;
  contingencyPaise: number;
  remainingPaise: number;
  isOverBudget: boolean;
  overBudgetPaise: number;
  utilizationPercentage: number;
}

/**
 * Checks if a value is a valid safe integer within 0 to Number.MAX_SAFE_INTEGER
 */
export function isValidPaise(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= Number.MAX_SAFE_INTEGER
  );
}

/**
 * Validates an allocation amount in paise.
 * Throws a descriptive error if invalid.
 */
export function validatePaiseAmount(amount: unknown, fieldName = 'Amount'): number {
  if (typeof amount !== 'number' || !Number.isFinite(amount) || !Number.isInteger(amount)) {
    throw new Error(`${fieldName} must be a valid integer in paise.`);
  }
  if (amount < 0) {
    throw new Error(`${fieldName} cannot be negative.`);
  }
  if (amount > Number.MAX_SAFE_INTEGER) {
    throw new Error(`${fieldName} exceeds maximum supported financial limit.`);
  }
  return amount;
}

/**
 * Sums up category allocations in integer paise.
 * Throws if overflow occurs.
 */
export function calculateAllocatedTotal(categories: Array<{ allocatedPaise: number }>): number {
  let total = 0;
  for (const cat of categories) {
    const val = validatePaiseAmount(cat.allocatedPaise, 'Category allocation');
    if (total + val > Number.MAX_SAFE_INTEGER) {
      throw new Error('Total allocation exceeds maximum safe integer range.');
    }
    total += val;
  }
  return total;
}

/**
 * Calculates remaining unallocated budget in paise.
 * Returns negative if over-allocated.
 */
export function calculateRemainingBudget(totalBudgetPaise: number, allocatedTotalPaise: number): number {
  validatePaiseAmount(totalBudgetPaise, 'Total budget');
  validatePaiseAmount(allocatedTotalPaise, 'Allocated total');
  return totalBudgetPaise - allocatedTotalPaise;
}

/**
 * Calculates contingency reserve in paise (e.g., 10% default).
 * Uses integer division with Math.floor to ensure clean paise integers.
 */
export function calculateContingencyAmount(totalBudgetPaise: number, percentage = 10): number {
  validatePaiseAmount(totalBudgetPaise, 'Total budget');
  if (percentage < 0 || percentage > 100) {
    throw new Error('Contingency percentage must be between 0 and 100.');
  }
  // Math: floor((totalBudgetPaise * percentage) / 100)
  return Math.floor((totalBudgetPaise * percentage) / 100);
}

/**
 * Calculates budget utilization as a rounded integer percentage (0 to 100+).
 */
export function calculateBudgetUtilization(totalBudgetPaise: number, allocatedTotalPaise: number): number {
  validatePaiseAmount(totalBudgetPaise, 'Total budget');
  validatePaiseAmount(allocatedTotalPaise, 'Allocated total');

  if (totalBudgetPaise === 0) {
    return allocatedTotalPaise > 0 ? 100 : 0;
  }

  // Rounded to 1 decimal place or integer
  const ratio = (allocatedTotalPaise / totalBudgetPaise) * 100;
  return Math.round(ratio * 10) / 10;
}

/**
 * Computes a full deterministic budget summary.
 */
export function getBudgetSummary(
  totalBudgetPaise: number,
  categories: Array<{ allocatedPaise: number }>,
  contingencyPaise = 0
): BudgetSummary {
  validatePaiseAmount(totalBudgetPaise, 'Total budget');
  validatePaiseAmount(contingencyPaise, 'Contingency');

  const allocatedTotalPaise = calculateAllocatedTotal(categories);
  const totalCommitted = allocatedTotalPaise + contingencyPaise;
  const remainingPaise = totalBudgetPaise - totalCommitted;
  const isOver = remainingPaise < 0;
  const overBudgetPaise = isOver ? Math.abs(remainingPaise) : 0;
  const utilizationPercentage = calculateBudgetUtilization(totalBudgetPaise, totalCommitted);

  return {
    totalBudgetPaise,
    allocatedTotalPaise,
    contingencyPaise,
    remainingPaise,
    isOverBudget: isOver,
    overBudgetPaise,
    utilizationPercentage,
  };
}
