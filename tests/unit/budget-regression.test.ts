import { describe, it, expect } from 'vitest';
import {
  getBudgetSummary,
  calculateContingencyAmount,
  calculateAvailableAllocation,
} from '@/lib/domain/budget';
import { getInitialSeedData } from '@/lib/domain/seeding';

describe('Budget & Contingency Model Regression Tests (Phase 3 Invariant Audit)', () => {
  it('guarantees category allocations + contingency === totalBudgetPaise on initial seeding', () => {
    const totalBudgetPaise = 120000000; // ₹12 Lakh
    const seed = getInitialSeedData('WEDDING', totalBudgetPaise);

    const categoriesSum = seed.categories.reduce((acc, c) => acc + c.allocatedPaise, 0);
    expect(categoriesSum + seed.contingencyPaise).toBe(totalBudgetPaise);

    const summary = getBudgetSummary(totalBudgetPaise, seed.categories, seed.contingencyPaise);

    // Critical Invariant: Initial event MUST NOT be flagged as over budget
    expect(summary.isOverBudget).toBe(false);
    expect(summary.overBudgetPaise).toBe(0);
    expect(summary.remainingPaise).toBe(0);
    expect(summary.unallocatedPaise).toBe(0);
    expect(summary.availableAllocationPaise).toBe(108000000); // ₹10.8 Lakh
    expect(summary.allocatedTotalPaise).toBe(108000000);
    expect(summary.contingencyPaise).toBe(12000000); // 10% = ₹1.2 Lakh
    expect(summary.totalCommittedPaise).toBe(120000000);
    expect(summary.utilizationPercentage).toBe(100);
  });

  it('correctly calculates available allocation pool after contingency reserve', () => {
    const total = 100000000; // ₹10 Lakh
    const contingency = 10000000; // ₹1 Lakh
    const available = calculateAvailableAllocation(total, contingency);
    expect(available).toBe(90000000); // ₹9 Lakh available to categories
  });

  it('correctly reflects unallocated amounts when categories do not use full available pool', () => {
    const total = 100000000; // ₹10 Lakh
    const contingency = 10000000; // ₹1 Lakh (available = 90 Lakh)
    const categories = [
      { allocatedPaise: 40000000 }, // ₹4 Lakh
      { allocatedPaise: 30000000 }, // ₹3 Lakh
    ]; // allocated = 70 Lakh

    const summary = getBudgetSummary(total, categories, contingency);

    expect(summary.availableAllocationPaise).toBe(90000000);
    expect(summary.allocatedTotalPaise).toBe(70000000);
    expect(summary.unallocatedPaise).toBe(20000000); // ₹2 Lakh unallocated in available pool
    expect(summary.totalCommittedPaise).toBe(80000000); // 70L + 10L = 80L committed
    expect(summary.remainingPaise).toBe(20000000);
    expect(summary.isOverBudget).toBe(false);
    expect(summary.utilizationPercentage).toBe(80);
  });

  it('accurately identifies over-budget condition and calculates exact deficit', () => {
    const total = 100000000; // ₹10 Lakh
    const contingency = 10000000; // ₹1 Lakh (available = 90 Lakh)
    const categories = [
      { allocatedPaise: 60000000 }, // ₹6 Lakh
      { allocatedPaise: 45000000 }, // ₹4.5 Lakh
    ]; // allocated = 105 Lakh

    const summary = getBudgetSummary(total, categories, contingency);

    // Total committed = 105L + 10L = 115L. Exceeds 100L by 15L (₹1.5 Lakh)
    expect(summary.isOverBudget).toBe(true);
    expect(summary.overBudgetPaise).toBe(15000000);
    expect(summary.remainingPaise).toBe(-15000000);
    expect(summary.unallocatedPaise).toBe(0);
    expect(summary.utilizationPercentage).toBe(115);
  });

  it('handles minimum budget edge case (₹1,000 = 100,000 paise) safely without precision loss', () => {
    const total = 100000; // ₹1,000 in paise
    const contingency = calculateContingencyAmount(total, 10);
    expect(contingency).toBe(10000); // ₹100

    const seed = getInitialSeedData('BIRTHDAY', total);
    const sum = seed.categories.reduce((acc, c) => acc + c.allocatedPaise, 0);
    expect(sum + seed.contingencyPaise).toBe(total);
  });

  it('handles zero budget safely', () => {
    const summary = getBudgetSummary(0, [], 0);
    expect(summary.isOverBudget).toBe(false);
    expect(summary.utilizationPercentage).toBe(0);
    expect(summary.remainingPaise).toBe(0);
  });
});

