/**
 * Gatherly AI — Deterministic Financial & Budget Domain Engine
 *
 * Core Principles:
 * 1. 100% deterministic arithmetic in integer minor units (paise).
 *    ₹1 = 100 paise. ₹12,00,000 = 120,000,000 paise.
 * 2. Financial Invariant:
 *    - totalBudgetPaise: user's maximum planned spending ceiling.
 *    - contingencyPaise: reserve contained WITHIN that maximum budget (default 10%).
 *    - availableAllocationPaise: totalBudgetPaise - contingencyPaise.
 *    - allocatedTotalPaise: sum of all category allocations.
 *    - unallocatedPaise: availableAllocationPaise - allocatedTotalPaise (can be 0 or positive).
 *    - totalCommittedPaise: allocatedTotalPaise + contingencyPaise.
 *    - remainingPaise: totalBudgetPaise - totalCommittedPaise.
 *    - isOverBudget: totalCommittedPaise > totalBudgetPaise (remainingPaise < 0).
 * 3. Zero floating-point arithmetic.
 */

export interface BudgetCategoryItem {
  id: string;
  name: string;
  allocatedPaise: number;
  estimatedPaise?: number;
}

export interface BudgetSummary {
  totalBudgetPaise: number;
  contingencyPaise: number;
  availableAllocationPaise: number;
  allocatedTotalPaise: number;
  unallocatedPaise: number;
  totalCommittedPaise: number;
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
 * Calculates available allocation budget after reserving contingency.
 * available = total - contingency
 */
export function calculateAvailableAllocation(totalBudgetPaise: number, contingencyPaise: number): number {
  validatePaiseAmount(totalBudgetPaise, 'Total budget');
  validatePaiseAmount(contingencyPaise, 'Contingency');
  return Math.max(0, totalBudgetPaise - contingencyPaise);
}

/**
 * Calculates remaining uncommitted budget across the entire ceiling.
 * Returns negative if over-allocated.
 */
export function calculateRemainingBudget(totalBudgetPaise: number, totalCommittedPaise: number): number {
  validatePaiseAmount(totalBudgetPaise, 'Total budget');
  validatePaiseAmount(totalCommittedPaise, 'Total committed');
  return totalBudgetPaise - totalCommittedPaise;
}

/**
 * Calculates contingency reserve in paise (default 10%).
 * Uses integer division with Math.floor to guarantee integer paise.
 */
export function calculateContingencyAmount(totalBudgetPaise: number, percentage = 10): number {
  validatePaiseAmount(totalBudgetPaise, 'Total budget');
  if (percentage < 0 || percentage > 100) {
    throw new Error('Contingency percentage must be between 0 and 100.');
  }
  return Math.floor((totalBudgetPaise * percentage) / 100);
}

/**
 * Calculates budget utilization as a percentage (0 to 100+).
 */
export function calculateBudgetUtilization(totalBudgetPaise: number, totalCommittedPaise: number): number {
  validatePaiseAmount(totalBudgetPaise, 'Total budget');
  validatePaiseAmount(totalCommittedPaise, 'Total committed');

  if (totalBudgetPaise === 0) {
    return totalCommittedPaise > 0 ? 100 : 0;
  }

  const ratio = (totalCommittedPaise / totalBudgetPaise) * 100;
  return Math.round(ratio * 10) / 10;
}

/**
 * Computes the full deterministic budget summary enforcing all invariants.
 */
export function getBudgetSummary(
  totalBudgetPaise: number,
  categories: Array<{ allocatedPaise: number }>,
  contingencyPaise = 0
): BudgetSummary {
  validatePaiseAmount(totalBudgetPaise, 'Total budget');
  validatePaiseAmount(contingencyPaise, 'Contingency');

  const availableAllocationPaise = calculateAvailableAllocation(totalBudgetPaise, contingencyPaise);
  const allocatedTotalPaise = calculateAllocatedTotal(categories);
  const unallocatedPaise = Math.max(0, availableAllocationPaise - allocatedTotalPaise);

  const totalCommittedPaise = allocatedTotalPaise + contingencyPaise;
  const remainingPaise = totalBudgetPaise - totalCommittedPaise;
  const isOver = remainingPaise < 0;
  const overBudgetPaise = isOver ? Math.abs(remainingPaise) : 0;
  const utilizationPercentage = calculateBudgetUtilization(totalBudgetPaise, totalCommittedPaise);

  return {
    totalBudgetPaise,
    contingencyPaise,
    availableAllocationPaise,
    allocatedTotalPaise,
    unallocatedPaise,
    totalCommittedPaise,
    remainingPaise,
    isOverBudget: isOver,
    overBudgetPaise,
    utilizationPercentage,
  };
}
