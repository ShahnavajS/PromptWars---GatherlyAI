import { describe, it, expect } from 'vitest';
import { evaluateChangeImpact, addDaysToIso, diffDays } from '@/lib/domain/impact/engine';
import { EventDetail } from '@/lib/services/eventService';
import { getBudgetSummary } from '@/lib/domain/budget';

describe('Deterministic Change-Impact Engine (Unit Tests)', () => {
  const baseEvent: EventDetail = {
    event: {
      id: 'evt_test_123',
      userId: 'usr_demo',
      title: 'Priya & Rohan Wedding',
      eventType: 'WEDDING',
      status: 'PLANNING',
      startDate: '2026-11-20',
      endDate: '2026-11-22',
      timezone: 'Asia/Kolkata',
      currency: 'INR',
      targetGuestCount: 200,
      venueCapacityMax: null,
      venueName: 'The Grand Bhagwati',
      venueCity: 'Ahmedabad',
      version: 1,
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z',
    },
    budget: {
      id: 'bdg_test_123',
      eventId: 'evt_test_123',
      totalBudgetPaise: 120000000, // ₹12 Lakh
      contingencyPaise: 12000000, // ₹1.2 Lakh (10%)
      currency: 'INR',
      updatedAt: '2026-10-01T00:00:00Z',
    },
    categories: [
      {
        id: 'cat_cater_1',
        budgetId: 'bdg_test_123',
        eventId: 'evt_test_123',
        name: 'Catering & Dining',
        allocatedPaise: 42000000, // ₹4.2 Lakh (~₹2,100/guest for 200 guests)
        estimatedPaise: 42000000,
        rateProvenance: 'INFERRED_ESTIMATE',
        unitRatePaise: null,
        sortOrder: 0,
        createdAt: '2026-10-01T00:00:00Z',
        updatedAt: '2026-10-01T00:00:00Z',
      },
      {
        id: 'cat_venue_1',
        budgetId: 'bdg_test_123',
        eventId: 'evt_test_123',
        name: 'Venue & Staging',
        allocatedPaise: 36000000, // ₹3.6 Lakh
        estimatedPaise: 36000000,
        rateProvenance: 'UNKNOWN_RATE',
        unitRatePaise: null,
        sortOrder: 1,
        createdAt: '2026-10-01T00:00:00Z',
        updatedAt: '2026-10-01T00:00:00Z',
      },
      {
        id: 'cat_decor_1',
        budgetId: 'bdg_test_123',
        eventId: 'evt_test_123',
        name: 'Decor & Flowers',
        allocatedPaise: 18000000, // ₹1.8 Lakh
        estimatedPaise: 18000000,
        rateProvenance: 'UNKNOWN_RATE',
        unitRatePaise: null,
        sortOrder: 2,
        createdAt: '2026-10-01T00:00:00Z',
        updatedAt: '2026-10-01T00:00:00Z',
      },
      {
        id: 'cat_photo_1',
        budgetId: 'bdg_test_123',
        eventId: 'evt_test_123',
        name: 'Photography & Cinema',
        allocatedPaise: 12000000, // ₹1.2 Lakh
        estimatedPaise: 12000000,
        rateProvenance: 'UNKNOWN_RATE',
        unitRatePaise: null,
        sortOrder: 3,
        createdAt: '2026-10-01T00:00:00Z',
        updatedAt: '2026-10-01T00:00:00Z',
      },
    ],
    tasks: [
      {
        id: 'tsk_1',
        eventId: 'evt_test_123',
        title: 'Finalise catering menu and headcount',
        description: 'Confirm plate count with caterer',
        category: 'CATERING',
        status: 'TODO',
        priority: 'HIGH',
        dueDate: '2026-11-01',
        deadlineProvenance: 'EVENT_RELATIVE',
        assignedTo: 'Family',
        isAiSuggested: false,
        createdAt: '2026-10-01T00:00:00Z',
        updatedAt: '2026-10-01T00:00:00Z',
      },
      {
        id: 'tsk_2',
        eventId: 'evt_test_123',
        title: 'Book main banquet hall',
        description: 'Pay deposit to secure venue',
        category: 'VENUE',
        status: 'DONE',
        priority: 'CRITICAL',
        dueDate: '2026-10-15',
        deadlineProvenance: 'FIXED_DATE',
        assignedTo: 'Rohan',
        isAiSuggested: false,
        createdAt: '2026-10-01T00:00:00Z',
        updatedAt: '2026-10-01T00:00:00Z',
      },
      {
        id: 'tsk_3',
        eventId: 'evt_test_123',
        title: 'Design invitations',
        description: 'Prepare wedding stationery',
        category: 'GENERAL',
        status: 'TODO',
        priority: 'MEDIUM',
        dueDate: null, // Unscheduled task
        deadlineProvenance: 'UNKNOWN',
        assignedTo: null,
        isAiSuggested: false,
        createdAt: '2026-10-01T00:00:00Z',
        updatedAt: '2026-10-01T00:00:00Z',
      },
    ],
    budgetSummary: getBudgetSummary(
      120000000,
      [
        { allocatedPaise: 42000000 },
        { allocatedPaise: 36000000 },
        { allocatedPaise: 18000000 },
        { allocatedPaise: 12000000 },
      ],
      12000000
    ),
  };

  describe('Date Helpers', () => {
    it('shifts ISO dates forward and backward correctly', () => {
      expect(addDaysToIso('2026-11-20', 10)).toBe('2026-11-30');
      expect(addDaysToIso('2026-11-20', 15)).toBe('2026-12-05');
      expect(addDaysToIso('2026-11-20', -5)).toBe('2026-11-15');
      expect(addDaysToIso('2026-12-31', 1)).toBe('2027-01-01');
    });

    it('calculates calendar day differences accurately', () => {
      expect(diffDays('2026-11-30', '2026-11-20')).toBe(10);
      expect(diffDays('2026-11-15', '2026-11-20')).toBe(-5);
      expect(diffDays('2026-11-20', '2026-11-20')).toBe(0);
    });
  });

  describe('Rule Group A: Guest-Count Changes', () => {
    it('scales catering allocation deterministically based on per-guest benchmark when increasing guests', () => {
      const result = evaluateChangeImpact(
        baseEvent,
        { targetGuestCount: 250 }, // +50 guests (+25%)
        'GUEST_COUNT'
      );

      const cateringFinding = result.findings.find(
        (f) => f.ruleId === 'RULE_GUEST_CATERING' && f.classification === 'CALCULATED_CHANGE'
      );
      expect(cateringFinding).toBeDefined();
      expect(cateringFinding?.automaticChangeAllowed).toBe(true);

      // Current rate: ₹4,20,000 / 200 = ₹2,100 per guest
      // Proposed 250 guests * ₹2,100 = ₹5,25,000 (52,500,000 paise)
      // Delta = +₹1,05,000 (10,500,000 paise)
      const action = cateringFinding?.proposedAction;
      expect(action?.type).toBe('ADJUST_CATEGORY_ALLOCATION');
      if (action?.type === 'ADJUST_CATEGORY_ALLOCATION') {
        expect(action.proposedPaise).toBe(52500000);
        expect(action.deltaPaise).toBe(10500000);
      }
    });

    it('scales catering allocation down when decreasing guest count', () => {
      const result = evaluateChangeImpact(
        baseEvent,
        { targetGuestCount: 150 }, // -50 guests (-25%)
        'GUEST_COUNT'
      );

      const cateringFinding = result.findings.find((f) => f.ruleId === 'RULE_GUEST_CATERING');
      expect(cateringFinding).toBeDefined();
      expect(cateringFinding?.proposedValue).toContain('3,15,000'); // 150 * 2,100 = 3,15,000
    });

    it('does not fabricate a cost when catering category has 0 allocation', () => {
      const unpricedEvent: EventDetail = {
        ...baseEvent,
        categories: baseEvent.categories.map((c) =>
          c.name.includes('Catering') ? { ...c, allocatedPaise: 0 } : c
        ),
      };

      const result = evaluateChangeImpact(
        unpricedEvent,
        { targetGuestCount: 250 },
        'GUEST_COUNT'
      );

      const cateringFinding = result.findings.find((f) => f.ruleId === 'RULE_GUEST_CATERING');
      expect(cateringFinding).toBeDefined();
      expect(cateringFinding?.classification).toBe('NEEDS_REVIEW');
      expect(cateringFinding?.automaticChangeAllowed).toBe(false);
      expect(cateringFinding?.proposedValue).toContain('Quote required');
    });

    it('flags guest-sensitive categories (Decor) for review without guessing numbers', () => {
      const result = evaluateChangeImpact(
        baseEvent,
        { targetGuestCount: 250 },
        'GUEST_COUNT'
      );

      const decorFinding = result.findings.find(
        (f) => f.entityId === 'cat_decor_1' && f.ruleId === 'RULE_GUEST_SENSITIVE_CATEGORIES'
      );
      expect(decorFinding).toBeDefined();
      expect(decorFinding?.classification).toBe('NEEDS_REVIEW');
      expect(decorFinding?.automaticChangeAllowed).toBe(false);
    });

    it('flags venue capacity check when guest increase is significant', () => {
      const result = evaluateChangeImpact(
        baseEvent,
        { targetGuestCount: 260 }, // +30% increase
        'GUEST_COUNT'
      );

      const venueFinding = result.findings.find((f) => f.ruleId === 'RULE_VENUE_CAPACITY');
      expect(venueFinding).toBeDefined();
      expect(venueFinding?.severity).toBe('WARNING');
      expect(venueFinding?.reason).toContain('The Grand Bhagwati');
    });

    it('flags guest-related tasks for review', () => {
      const result = evaluateChangeImpact(
        baseEvent,
        { targetGuestCount: 250 },
        'GUEST_COUNT'
      );

      const taskFinding = result.findings.find((f) => f.entityId === 'tsk_1');
      expect(taskFinding).toBeDefined();
      expect(taskFinding?.title).toContain('Finalise catering menu and headcount');
    });
  });

  describe('Rule Group B: Event-Date Changes', () => {
    it('shifts incomplete task due dates by the exact day delta with opt-in action', () => {
      const result = evaluateChangeImpact(
        baseEvent,
        { startDate: '2026-12-05' }, // Shifted by +15 days from 2026-11-20
        'EVENT_DATE'
      );

      const taskFinding = result.findings.find(
        (f) => f.entityId === 'tsk_1' && f.ruleId === 'RULE_DATE_TASK_DEADLINE'
      );
      expect(taskFinding).toBeDefined();
      expect(taskFinding?.classification).toBe('CALCULATED_CHANGE');
      expect(taskFinding?.automaticChangeAllowed).toBe(true);

      // tsk_1 dueDate was 2026-11-01 + 15 days = 2026-11-16
      expect(taskFinding?.proposedValue).toBe('2026-11-16');

      const action = taskFinding?.proposedAction;
      expect(action?.type).toBe('SHIFT_TASK_DUE_DATE');
      if (action?.type === 'SHIFT_TASK_DUE_DATE') {
        expect(action.proposedDueDate).toBe('2026-11-16');
        expect(action.shiftDays).toBe(15);
      }
    });

    it('preserves completed tasks without modifying their deadlines', () => {
      const result = evaluateChangeImpact(
        baseEvent,
        { startDate: '2026-12-05' },
        'EVENT_DATE'
      );

      const doneTaskFinding = result.findings.find(
        (f) => f.entityId === 'tsk_2' && f.ruleId === 'RULE_DATE_COMPLETED_TASK_PRESERVED'
      );
      expect(doneTaskFinding).toBeDefined();
      expect(doneTaskFinding?.classification).toBe('INFO');
      expect(doneTaskFinding?.automaticChangeAllowed).toBe(false);
      expect(doneTaskFinding?.proposedValue).toBe('Preserved unchanged');
    });

    it('identifies unscheduled tasks without fabricating dates', () => {
      const result = evaluateChangeImpact(
        baseEvent,
        { startDate: '2026-12-05' },
        'EVENT_DATE'
      );

      const unscheduledFinding = result.findings.find(
        (f) => f.entityId === 'tsk_3' && f.ruleId === 'RULE_DATE_TASK_UNSCHEDULED'
      );
      expect(unscheduledFinding).toBeDefined();
      expect(unscheduledFinding?.classification).toBe('NEEDS_REVIEW');
      expect(unscheduledFinding?.automaticChangeAllowed).toBe(false);
      expect(unscheduledFinding?.proposedValue).toBe('Schedule required');
    });

    it('detects invalid date range where end date precedes start date', () => {
      const result = evaluateChangeImpact(
        baseEvent,
        { startDate: '2026-11-25', endDate: '2026-11-20' },
        'EVENT_DATE'
      );

      const invalidRange = result.findings.find(
        (f) => f.ruleId === 'RULE_DATE_MULTI_DAY_RANGE'
      );
      expect(invalidRange).toBeDefined();
      expect(invalidRange?.severity).toBe('CRITICAL');
      expect(invalidRange?.classification).toBe('CONSTRAINT_VIOLATION');
    });
  });

  describe('Rule Group C: Total-Budget Changes', () => {
    it('detects budget deficit when reducing budget below existing committed allocations', () => {
      // Existing allocations: ₹10.8 Lakh (108,000,000 paise)
      // New budget: ₹10 Lakh (100,000,000 paise).
      // 10% contingency on ₹10 Lakh = ₹1 Lakh.
      // Total committed = ₹10.8 Lakh + ₹1 Lakh = ₹11.8 Lakh.
      // Deficit = ₹1.8 Lakh (18,000,000 paise).
      const result = evaluateChangeImpact(
        baseEvent,
        { totalBudgetRupees: 1000000 },
        'TOTAL_BUDGET'
      );

      const deficitFinding = result.findings.find((f) => f.ruleId === 'RULE_BUDGET_DEFICIT');
      expect(deficitFinding).toBeDefined();
      expect(deficitFinding?.severity).toBe('CRITICAL');
      expect(deficitFinding?.classification).toBe('CONSTRAINT_VIOLATION');
      expect(deficitFinding?.title).toContain('Budget Deficit');
      expect(deficitFinding?.title).toContain('1,80,000');
    });

    it('calculates unallocated surplus when increasing budget ceiling', () => {
      // New budget: ₹15 Lakh (150,000,000 paise).
      // Contingency 10% = ₹1.5 Lakh.
      // Current allocations = ₹10.8 Lakh.
      // Total committed = ₹10.8 + ₹1.5 = ₹12.3 Lakh.
      // Surplus = ₹15 - ₹12.3 = ₹2.7 Lakh (27,000,000 paise).
      const result = evaluateChangeImpact(
        baseEvent,
        { totalBudgetRupees: 1500000 },
        'TOTAL_BUDGET'
      );

      const surplusFinding = result.findings.find((f) => f.ruleId === 'RULE_BUDGET_SURPLUS');
      expect(surplusFinding).toBeDefined();
      expect(surplusFinding?.classification).toBe('INFO');
      expect(surplusFinding?.title).toContain('2,70,000');
    });
  });

  describe('Rule Group D: Venue / City Relocation', () => {
    it('flags vendor and travel re-verification when changing city', () => {
      const result = evaluateChangeImpact(
        baseEvent,
        { venueCity: 'Udaipur' },
        'VENUE'
      );

      const cityFinding = result.findings.find((f) => f.ruleId === 'RULE_VENUE_LOCATION');
      expect(cityFinding).toBeDefined();
      expect(cityFinding?.severity).toBe('WARNING');
      expect(cityFinding?.title).toContain('Ahmedabad → Udaipur');
    });
  });
});
