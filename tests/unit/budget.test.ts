import { describe, it, expect } from 'vitest';
import {
  isValidPaise,
  validatePaiseAmount,
  calculateAllocatedTotal,
  calculateRemainingBudget,
  calculateContingencyAmount,
  calculateBudgetUtilization,
  getBudgetSummary,
} from '@/lib/domain/budget';

describe('Deterministic Financial & Budget Engine', () => {
  describe('isValidPaise', () => {
    it('correctly identifies valid non-negative integer paise', () => {
      expect(isValidPaise(0)).toBe(true);
      expect(isValidPaise(100)).toBe(true);
      expect(isValidPaise(120000000)).toBe(true);
      expect(isValidPaise(-1)).toBe(false);
      expect(isValidPaise(10.5)).toBe(false);
      expect(isValidPaise('100')).toBe(false);
      expect(isValidPaise(null)).toBe(false);
    });
  });

  describe('validatePaiseAmount', () => {
    it('accepts valid non-negative integer paise', () => {
      expect(validatePaiseAmount(0)).toBe(0);
      expect(validatePaiseAmount(100)).toBe(100);
      expect(validatePaiseAmount(120000000)).toBe(120000000); // ₹12 Lakh
    });

    it('rejects negative numbers', () => {
      expect(() => validatePaiseAmount(-1)).toThrow('cannot be negative');
      expect(() => validatePaiseAmount(-50000)).toThrow('cannot be negative');
    });

    it('rejects floating-point currency values (must be integer paise)', () => {
      expect(() => validatePaiseAmount(100.5)).toThrow('must be a valid integer in paise');
      expect(() => validatePaiseAmount(12.0000004)).toThrow('must be a valid integer in paise');
    });

    it('rejects non-numeric values and NaN', () => {
      expect(() => validatePaiseAmount(NaN)).toThrow();
      expect(() => validatePaiseAmount('1000')).toThrow();
      expect(() => validatePaiseAmount(null)).toThrow();
      expect(() => validatePaiseAmount(undefined)).toThrow();
    });

    it('rejects numbers exceeding safe integer range', () => {
      expect(() => validatePaiseAmount(Number.MAX_SAFE_INTEGER + 100)).toThrow('exceeds maximum');
    });
  });

  describe('calculateAllocatedTotal', () => {
    it('sums category allocations accurately with zero float drift', () => {
      const categories = [
        { allocatedPaise: 30000000 }, // ₹3,00,000
        { allocatedPaise: 25000000 }, // ₹2,50,000
        { allocatedPaise: 15000000 }, // ₹1,50,000
        { allocatedPaise: 12000000 }, // ₹1,20,000
        { allocatedPaise: 8000000 },  // ₹80,000
      ];
      // Sum = 90,000,000 paise (₹9,00,000)
      expect(calculateAllocatedTotal(categories)).toBe(90000000);
    });

    it('returns 0 for empty categories list', () => {
      expect(calculateAllocatedTotal([])).toBe(0);
    });
  });

  describe('calculateRemainingBudget', () => {
    it('calculates positive remaining unallocated budget', () => {
      const total = 120000000; // ₹12 Lakh
      const allocated = 100000000; // ₹10 Lakh
      expect(calculateRemainingBudget(total, allocated)).toBe(20000000); // ₹2 Lakh
    });

    it('returns negative when allocated exceeds total ceiling', () => {
      const total = 100000000; // ₹10 Lakh
      const allocated = 120000000; // ₹12 Lakh
      expect(calculateRemainingBudget(total, allocated)).toBe(-20000000);
    });
  });

  describe('calculateContingencyAmount', () => {
    it('computes 10% contingency reserve as clean integer paise', () => {
      const total = 150000000; // ₹15 Lakh
      expect(calculateContingencyAmount(total, 10)).toBe(15000000); // ₹1.5 Lakh
    });

    it('handles rounding safely using floor', () => {
      const total = 105;
      expect(calculateContingencyAmount(total, 10)).toBe(10);
    });
  });

  describe('calculateBudgetUtilization', () => {
    it('calculates utilization percentage correctly', () => {
      expect(calculateBudgetUtilization(100000000, 50000000)).toBe(50);
      expect(calculateBudgetUtilization(100000000, 100000000)).toBe(100);
      expect(calculateBudgetUtilization(100000000, 120000000)).toBe(120);
    });

    it('handles zero total budget safely', () => {
      expect(calculateBudgetUtilization(0, 0)).toBe(0);
      expect(calculateBudgetUtilization(0, 1000)).toBe(100);
    });
  });

  describe('getBudgetSummary', () => {
    it('reports allocated sum separately from total budget ceiling', () => {
      const total = 100000000; // ₹10 Lakh
      const categories = [
        { allocatedPaise: 40000000 },
        { allocatedPaise: 30000000 },
      ];
      const contingency = 10000000; // ₹1 Lakh

      const summary = getBudgetSummary(total, categories, contingency);

      expect(summary.totalBudgetPaise).toBe(100000000);
      expect(summary.allocatedTotalPaise).toBe(70000000);
      expect(summary.contingencyPaise).toBe(10000000);
      expect(summary.remainingPaise).toBe(20000000);
      expect(summary.isOverBudget).toBe(false);
      expect(summary.overBudgetPaise).toBe(0);
      expect(summary.utilizationPercentage).toBe(80);
    });

    it('detects over-budget and reports exact deficit', () => {
      const total = 50000000; // ₹5 Lakh
      const categories = [
        { allocatedPaise: 40000000 },
        { allocatedPaise: 20000000 },
      ];
      const contingency = 5000000; // ₹50k

      const summary = getBudgetSummary(total, categories, contingency);

      expect(summary.isOverBudget).toBe(true);
      expect(summary.overBudgetPaise).toBe(15000000); // 65 Lakh - 50 Lakh = 15 Lakh
      expect(summary.remainingPaise).toBe(-15000000);
      expect(summary.utilizationPercentage).toBe(130);
    });
  });
});
