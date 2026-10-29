import { describe, it, expect } from 'vitest';
import { getInitialSeedData } from '@/lib/domain/seeding';

describe('Deterministic Initial Seeding', () => {
  it('guarantees that Wedding categories + contingency sum exactly to total budget paise', () => {
    const totalPaise = 150000000; // ₹15 Lakh
    const seed = getInitialSeedData('WEDDING', totalPaise);

    const categoriesSum = seed.categories.reduce((acc, cat) => acc + cat.allocatedPaise, 0);
    const totalAllocated = categoriesSum + seed.contingencyPaise;

    expect(totalAllocated).toBe(totalPaise);
    expect(seed.categories.length).toBe(5);
    expect(seed.tasks.length).toBeGreaterThanOrEqual(4);
  });

  it('guarantees that Birthday categories + contingency sum exactly to total budget paise', () => {
    const totalPaise = 50000000; // ₹5 Lakh
    const seed = getInitialSeedData('BIRTHDAY', totalPaise);

    const categoriesSum = seed.categories.reduce((acc, cat) => acc + cat.allocatedPaise, 0);
    const totalAllocated = categoriesSum + seed.contingencyPaise;

    expect(totalAllocated).toBe(totalPaise);
    expect(seed.categories.some((c) => c.name.includes('Food'))).toBe(true);
  });

  it('guarantees that Community categories + contingency sum exactly to total budget paise', () => {
    const totalPaise = 80000000; // ₹8 Lakh
    const seed = getInitialSeedData('COMMUNITY', totalPaise);

    const categoriesSum = seed.categories.reduce((acc, cat) => acc + cat.allocatedPaise, 0);
    const totalAllocated = categoriesSum + seed.contingencyPaise;

    expect(totalAllocated).toBe(totalPaise);
    expect(seed.tasks.some((t) => t.category === 'VENUE')).toBe(true);
  });

  it('prevents 1-paisa rounding drifts with odd numbers', () => {
    const oddTotalPaise = 100000003; // odd paise
    const seed = getInitialSeedData('WEDDING', oddTotalPaise);

    const categoriesSum = seed.categories.reduce((acc, cat) => acc + cat.allocatedPaise, 0);
    const totalAllocated = categoriesSum + seed.contingencyPaise;

    expect(totalAllocated).toBe(oddTotalPaise);
  });
});
