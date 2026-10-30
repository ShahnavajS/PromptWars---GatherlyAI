import { describe, it, expect, vi } from 'vitest';
import { formatINR, formatCompactINR, formatDate, calculateDaysRemaining } from '@/lib/domain/formatting';

describe('Indian Currency & Date Formatting', () => {
  describe('formatINR', () => {
    it('formats rupees with Indian Lakh/Crore grouping', () => {
      expect(formatINR(120000000)).toBe('₹12,00,000');
      expect(formatINR(150000000)).toBe('₹15,00,000');
      expect(formatINR(2500000000)).toBe('₹2,50,00,000'); // 2.5 Crore
      expect(formatINR(5000000)).toBe('₹50,000');
      expect(formatINR(50000)).toBe('₹500');
      expect(formatINR(0)).toBe('₹0');
    });

    it('formats negative amounts with leading minus', () => {
      expect(formatINR(-5000000)).toBe('-₹50,000');
    });

    it('includes paise if requested and non-zero', () => {
      expect(formatINR(125050, { includePaise: true })).toBe('₹1,250.50');
    });
  });

  describe('formatCompactINR', () => {
    it('produces human-friendly compact strings in Lakhs and Crores', () => {
      expect(formatCompactINR(120000000)).toBe('₹12 Lakh');
      expect(formatCompactINR(150000000)).toBe('₹15 Lakh');
      expect(formatCompactINR(2500000000)).toBe('₹2.5 Cr');
      expect(formatCompactINR(5000000)).toBe('₹50,000');
    });
  });

  describe('formatDate', () => {
    it('formats ISO date into readable string in Asia/Kolkata', () => {
      const formatted = formatDate('2026-11-20', { format: 'medium' });
      expect(formatted).toContain('Nov');
      expect(formatted).toContain('2026');
    });

    it('handles empty or invalid date gracefully', () => {
      expect(formatDate('')).toBe('Date TBD');
      expect(formatDate('invalid-date')).toBe('invalid-date');
    });
  });

  describe('calculateDaysRemaining', () => {
    it('calculates future event countdown', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-10-29T20:00:00Z')); // 30 October in Kolkata
      const res = calculateDaysRemaining('2026-11-09');
      expect(res.isPast).toBe(false);
      expect(res.days).toBe(10);
      expect(res.label).toBe('10 days to go');
      vi.useRealTimers();
    });
  });
});
