import { describe, expect, it } from 'vitest';
import { isIsoDate, isClockTime } from '@/lib/validation/date';
import { CreateEventSchema } from '@/lib/validation/events';
import { CreateScheduleItemSchema } from '@/lib/validation/schedule';

describe('date-only and time validation', () => {
  it('accepts leap day and rejects impossible dates', () => {
    expect(isIsoDate('2028-02-29')).toBe(true);
    expect(isIsoDate('2026-02-29')).toBe(false);
    expect(isIsoDate('2026-13-01')).toBe(false);
  });

  it('checks 24-hour clock bounds', () => {
    expect(isClockTime('23:59')).toBe(true);
    expect(isClockTime('24:00')).toBe(false);
    expect(isClockTime('12:61')).toBe(false);
  });

  it('rejects invalid event and schedule values at the API boundary', () => {
    const event = {
      title: 'Impossible date', eventType: 'BIRTHDAY', startDate: '2026-02-29',
      targetGuestCount: 10, totalBudgetRupees: 1000,
    };
    expect(CreateEventSchema.safeParse(event).success).toBe(false);
    expect(CreateScheduleItemSchema.safeParse({
      dayNumber: 1, date: '2026-10-30', title: 'Invalid time',
      startTime: '14:00', endTime: '13:00', sortOrder: 0,
    }).success).toBe(false);
  });
});
