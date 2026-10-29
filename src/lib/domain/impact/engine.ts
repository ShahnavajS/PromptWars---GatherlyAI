import { EventDetail } from '@/lib/services/eventService';
import {
  ChangeType,
  ProposedChanges,
  ImpactFinding,
  ImpactPreviewResult,
  AdjustCategoryAction,
  ShiftTaskDueDateAction,
} from './schemas';
import { formatINR } from '@/lib/domain/formatting';
import { calculateContingencyAmount, calculateAvailableAllocation, calculateAllocatedTotal } from '@/lib/domain/budget';
import crypto from 'crypto';

/**
 * Shifts an ISO date string (YYYY-MM-DD) by given number of days.
 */
export function addDaysToIso(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

/**
 * Calculates calendar day difference (target - source).
 */
export function diffDays(targetIso: string, sourceIso: string): number {
  const [ty, tm, td] = targetIso.split('-').map(Number);
  const [sy, sm, sd] = sourceIso.split('-').map(Number);
  const targetUtc = Date.UTC(ty, tm - 1, td);
  const sourceUtc = Date.UTC(sy, sm - 1, sd);
  return Math.round((targetUtc - sourceUtc) / (1000 * 60 * 60 * 24));
}

/**
 * Evaluates the impact of proposed event changes deterministically.
 */
export function evaluateChangeImpact(
  snapshot: EventDetail,
  proposed: ProposedChanges,
  changeType: ChangeType
): ImpactPreviewResult {
  const findings: ImpactFinding[] = [];
  const previewId = `prv_${crypto.randomUUID()}`;

  const oldGuests = snapshot.event.targetGuestCount;
  const newGuests = proposed.targetGuestCount !== undefined ? proposed.targetGuestCount : oldGuests;

  const oldStart = snapshot.event.startDate;
  const newStart = proposed.startDate !== undefined ? proposed.startDate : oldStart;

  const oldEnd = snapshot.event.endDate;
  const newEnd = proposed.endDate !== undefined ? proposed.endDate : oldEnd;

  const oldBudgetPaise = snapshot.budget.totalBudgetPaise;
  const newBudgetPaise =
    proposed.totalBudgetRupees !== undefined ? proposed.totalBudgetRupees * 100 : oldBudgetPaise;

  const oldCity = snapshot.event.venueCity;
  const newCity = proposed.venueCity !== undefined ? proposed.venueCity : oldCity;

  const oldVenueName = snapshot.event.venueName;
  const newVenueName = proposed.venueName !== undefined ? proposed.venueName : oldVenueName;

  // =========================================================================
  // 1. GUEST COUNT IMPACT RULES
  // =========================================================================
  if (newGuests !== oldGuests) {
    const diffGuests = newGuests - oldGuests;
    const pctDelta = oldGuests > 0 ? Math.round(((newGuests - oldGuests) / oldGuests) * 100) : 100;
    const signText = diffGuests > 0 ? `+${diffGuests}` : `${diffGuests}`;

    // A. Catering Benchmark Evaluation
    const cateringCat = snapshot.categories.find((c) =>
      /cater|dining|food|meal|refreshment/i.test(c.name)
    );

    if (cateringCat) {
      if (cateringCat.allocatedPaise > 0 && oldGuests > 0) {
        const unitRatePaise = Math.round(cateringCat.allocatedPaise / oldGuests);
        const proposedAllocationPaise = Math.round(unitRatePaise * newGuests);
        const deltaPaise = proposedAllocationPaise - cateringCat.allocatedPaise;

        const action: AdjustCategoryAction = {
          id: `act_cat_${cateringCat.id}`,
          type: 'ADJUST_CATEGORY_ALLOCATION',
          categoryId: cateringCat.id,
          categoryName: cateringCat.name,
          currentPaise: cateringCat.allocatedPaise,
          proposedPaise: proposedAllocationPaise,
          deltaPaise,
          rationale: `Proportional per-guest catering rate of ~${formatINR(unitRatePaise)}/guest applied to ${newGuests} guests.`,
        };

        findings.push({
          id: `find_catering_${cateringCat.id}`,
          eventId: snapshot.event.id,
          changeType: 'GUEST_COUNT',
          entityType: 'BUDGET_CATEGORY',
          entityId: cateringCat.id,
          title: `Catering scale recommendation: ${signText} guests (${pctDelta > 0 ? `+${pctDelta}` : pctDelta}%)`,
          reason: `Headcount changed from ${oldGuests} to ${newGuests}. Based on existing allocation of ${formatINR(
            cateringCat.allocatedPaise
          )} (~${formatINR(unitRatePaise)}/guest), estimated catering changes by ${
            deltaPaise >= 0 ? '+' : ''
          }${formatINR(deltaPaise)} to ${formatINR(proposedAllocationPaise)}.`,
          severity: Math.abs(pctDelta) >= 20 ? 'WARNING' : 'INFO',
          classification: 'CALCULATED_CHANGE',
          previousValue: formatINR(cateringCat.allocatedPaise),
          proposedValue: formatINR(proposedAllocationPaise),
          requiredUserAction:
            'Review calculated estimate and choose whether to adjust catering allocation.',
          automaticChangeAllowed: true,
          ruleId: 'RULE_GUEST_CATERING',
          proposedAction: action,
        });
      } else {
        findings.push({
          id: `find_catering_unpriced_${cateringCat.id}`,
          eventId: snapshot.event.id,
          changeType: 'GUEST_COUNT',
          entityType: 'BUDGET_CATEGORY',
          entityId: cateringCat.id,
          title: 'Catering requirements need quote review',
          reason: `Headcount changed from ${oldGuests} to ${newGuests}, but no per-guest catering baseline is established. No arbitrary cost was fabricated.`,
          severity: 'WARNING',
          classification: 'NEEDS_REVIEW',
          previousValue: formatINR(cateringCat.allocatedPaise),
          proposedValue: 'Quote required',
          requiredUserAction: `Request updated per-plate catering quotation for ${newGuests} guests.`,
          automaticChangeAllowed: false,
          ruleId: 'RULE_GUEST_CATERING',
          proposedAction: null,
        });
      }
    }

    // B. Other Guest-Sensitive Categories (Decor, Invitations, Favors, Logistics)
    const sensitiveCats = snapshot.categories.filter(
      (c) =>
        c.id !== cateringCat?.id &&
        /decor|flower|invitation|card|gift|favor|transport|seating|furniture/i.test(c.name)
    );

    sensitiveCats.forEach((cat) => {
      findings.push({
        id: `find_cat_guest_${cat.id}`,
        eventId: snapshot.event.id,
        changeType: 'GUEST_COUNT',
        entityType: 'BUDGET_CATEGORY',
        entityId: cat.id,
        title: `${cat.name} review required`,
        reason: `Headcount shifted by ${signText} guests. Order quantities, print counts, or seating materials may require supplier re-confirmation.`,
        severity: 'INFO',
        classification: 'NEEDS_REVIEW',
        previousValue: formatINR(cat.allocatedPaise),
        proposedValue: 'Pending review',
        requiredUserAction: 'Verify quantities and confirm if supplier order needs revision.',
        automaticChangeAllowed: false,
        ruleId: 'RULE_GUEST_SENSITIVE_CATEGORIES',
        proposedAction: null,
      });
    });

    // C. Venue Capacity Rule
    if (diffGuests > 0 && (pctDelta >= 20 || newGuests >= 200)) {
      findings.push({
        id: `find_venue_capacity_${snapshot.event.id}`,
        eventId: snapshot.event.id,
        changeType: 'GUEST_COUNT',
        entityType: 'VENUE',
        entityId: snapshot.event.id,
        title: 'Venue capacity & seating layout check',
        reason: `Headcount increased by ${signText} guests to ${newGuests}. Ensure ${
          newVenueName || newCity
        } can accommodate this group size with banquet seating, stage buffer, and dining movement.`,
        severity: pctDelta >= 35 ? 'CRITICAL' : 'WARNING',
        classification: 'NEEDS_REVIEW',
        previousValue: `${oldGuests} guests`,
        proposedValue: `${newGuests} guests`,
        requiredUserAction:
          'Contact venue manager to verify fire-safety limits and seating capacity.',
        automaticChangeAllowed: false,
        ruleId: 'RULE_VENUE_CAPACITY',
        proposedAction: null,
      });
    }

    // D. Guest-Sensitive Tasks
    const sensitiveTasks = snapshot.tasks.filter((t) =>
      /cater|menu|guest|headcount|invitation|rsvp|seating|table|transport/i.test(t.title)
    );

    sensitiveTasks.forEach((tsk) => {
      findings.push({
        id: `find_task_guest_${tsk.id}`,
        eventId: snapshot.event.id,
        changeType: 'GUEST_COUNT',
        entityType: 'EVENT_TASK',
        entityId: tsk.id,
        title: `Task review: "${tsk.title}"`,
        reason: `Task directly depends on guest count (now ${newGuests} guests).`,
        severity: 'INFO',
        classification: 'NEEDS_REVIEW',
        previousValue: tsk.status,
        proposedValue: 'Review needed',
        requiredUserAction: 'Ensure vendor deliverables align with updated guest headcount.',
        automaticChangeAllowed: false,
        ruleId: 'RULE_GUEST_TASKS',
        proposedAction: null,
      });
    });
  }

  // =========================================================================
  // 2. EVENT DATE IMPACT RULES
  // =========================================================================
  const shiftDays = diffDays(newStart, oldStart);
  const dateChanged = shiftDays !== 0 || newEnd !== oldEnd;

  if (dateChanged) {
    // A. Multi-Day Range Validation
    if (newEnd && diffDays(newEnd, newStart) < 0) {
      findings.push({
        id: `find_date_range_invalid_${snapshot.event.id}`,
        eventId: snapshot.event.id,
        changeType: 'EVENT_DATE',
        entityType: 'SCHEDULE',
        entityId: snapshot.event.id,
        title: 'Invalid Date Range Constraint',
        reason: `Proposed end date (${newEnd}) is before start date (${newStart}).`,
        severity: 'CRITICAL',
        classification: 'CONSTRAINT_VIOLATION',
        previousValue: `${oldStart} → ${oldEnd || 'None'}`,
        proposedValue: `${newStart} → ${newEnd}`,
        requiredUserAction: 'Correct end date to be on or after start date.',
        automaticChangeAllowed: false,
        ruleId: 'RULE_DATE_MULTI_DAY_RANGE',
        proposedAction: null,
      });
    }

    // B. Proximity / Past Date Check
    const todayIso = new Date().toISOString().split('T')[0];
    const daysUntilNew = diffDays(newStart, todayIso);

    if (daysUntilNew < 0) {
      findings.push({
        id: `find_date_in_past_${snapshot.event.id}`,
        eventId: snapshot.event.id,
        changeType: 'EVENT_DATE',
        entityType: 'SCHEDULE',
        entityId: snapshot.event.id,
        title: 'Proposed event date is in the past',
        reason: `Start date ${newStart} precedes current date ${todayIso}.`,
        severity: 'CRITICAL',
        classification: 'CONSTRAINT_VIOLATION',
        previousValue: oldStart,
        proposedValue: newStart,
        requiredUserAction: 'Select a valid future date.',
        automaticChangeAllowed: false,
        ruleId: 'RULE_DATE_PROXIMITY',
        proposedAction: null,
      });
    } else if (daysUntilNew <= 14) {
      findings.push({
        id: `find_date_short_notice_${snapshot.event.id}`,
        eventId: snapshot.event.id,
        changeType: 'EVENT_DATE',
        entityType: 'SCHEDULE',
        entityId: snapshot.event.id,
        title: 'Short preparation window notice',
        reason: `Only ${daysUntilNew} day(s) remain until proposed event date. Vendor lead times may be constrained.`,
        severity: 'WARNING',
        classification: 'NEEDS_REVIEW',
        previousValue: oldStart,
        proposedValue: newStart,
        requiredUserAction: 'Verify urgent vendor availability and expedited logistics.',
        automaticChangeAllowed: false,
        ruleId: 'RULE_DATE_PROXIMITY',
        proposedAction: null,
      });
    }

    // C. Task Deadlines Handling
    if (shiftDays !== 0) {
      // Incomplete tasks with explicit due dates
      const incompleteTasksWithDue = snapshot.tasks.filter(
        (t) => t.status !== 'DONE' && t.dueDate !== null
      );

      incompleteTasksWithDue.forEach((task) => {
        const proposedDue = addDaysToIso(task.dueDate!, shiftDays);
        const action: ShiftTaskDueDateAction = {
          id: `act_tsk_${task.id}`,
          type: 'SHIFT_TASK_DUE_DATE',
          taskId: task.id,
          taskTitle: task.title,
          currentDueDate: task.dueDate,
          proposedDueDate: proposedDue,
          shiftDays,
          rationale: `Event date moved by ${shiftDays > 0 ? `+${shiftDays}` : shiftDays} days; shift milestone deadline proportionally.`,
        };

        findings.push({
          id: `find_task_date_${task.id}`,
          eventId: snapshot.event.id,
          changeType: 'EVENT_DATE',
          entityType: 'EVENT_TASK',
          entityId: task.id,
          title: `Shift milestone deadline for "${task.title}"`,
          reason: `Event moved by ${shiftDays > 0 ? `+${shiftDays}` : shiftDays} days. Propose shifting deadline from ${task.dueDate} to ${proposedDue} to preserve planning lead time.`,
          severity: 'INFO',
          classification: 'CALCULATED_CHANGE',
          previousValue: task.dueDate,
          proposedValue: proposedDue,
          requiredUserAction: 'Review and confirm whether to shift this task deadline.',
          automaticChangeAllowed: true,
          ruleId: 'RULE_DATE_TASK_DEADLINE',
          proposedAction: action,
        });
      });

      // Incomplete tasks without due dates
      const incompleteTasksNoDue = snapshot.tasks.filter(
        (t) => t.status !== 'DONE' && t.dueDate === null
      );

      incompleteTasksNoDue.forEach((task) => {
        findings.push({
          id: `find_task_nodue_${task.id}`,
          eventId: snapshot.event.id,
          changeType: 'EVENT_DATE',
          entityType: 'EVENT_TASK',
          entityId: task.id,
          title: `Unscheduled task: "${task.title}"`,
          reason: `Event date changed, but this task has no scheduled milestone due date. No date was artificially fabricated.`,
          severity: 'INFO',
          classification: 'NEEDS_REVIEW',
          previousValue: 'None',
          proposedValue: 'Schedule required',
          requiredUserAction: 'Assign a milestone target date if needed.',
          automaticChangeAllowed: false,
          ruleId: 'RULE_DATE_TASK_UNSCHEDULED',
          proposedAction: null,
        });
      });

      // Completed tasks MUST remain preserved
      const completedTasks = snapshot.tasks.filter((t) => t.status === 'DONE');
      completedTasks.forEach((task) => {
        findings.push({
          id: `find_task_completed_${task.id}`,
          eventId: snapshot.event.id,
          changeType: 'EVENT_DATE',
          entityType: 'EVENT_TASK',
          entityId: task.id,
          title: `Completed task preserved: "${task.title}"`,
          reason: 'Task is already marked DONE. Completed records and their timestamps are safely preserved.',
          severity: 'INFO',
          classification: 'INFO',
          previousValue: task.dueDate || 'DONE',
          proposedValue: 'Preserved unchanged',
          requiredUserAction: 'No action required.',
          automaticChangeAllowed: false,
          ruleId: 'RULE_DATE_COMPLETED_TASK_PRESERVED',
          proposedAction: null,
        });
      });
    }
  }

  // =========================================================================
  // 3. TOTAL BUDGET IMPACT RULES
  // =========================================================================
  if (newBudgetPaise !== oldBudgetPaise) {
    const newContingency = calculateContingencyAmount(newBudgetPaise, 10);
    const newAvailable = calculateAvailableAllocation(newBudgetPaise, newContingency);
    const currentAllocated = calculateAllocatedTotal(snapshot.categories);
    const newTotalCommitted = currentAllocated + newContingency;
    const newRemaining = newBudgetPaise - newTotalCommitted;

    if (newRemaining < 0) {
      const deficitPaise = Math.abs(newRemaining);
      findings.push({
        id: `find_budget_deficit_${snapshot.budget.id}`,
        eventId: snapshot.event.id,
        changeType: 'TOTAL_BUDGET',
        entityType: 'EVENT_BUDGET',
        entityId: snapshot.budget.id,
        title: `Budget Deficit: Over by ${formatINR(deficitPaise)}`,
        reason: `Reducing budget to ${formatINR(
          newBudgetPaise
        )} causes allocations (${formatINR(currentAllocated)}) plus 10% contingency (${formatINR(
          newContingency
        )}) to exceed the ceiling by ${formatINR(deficitPaise)}.`,
        severity: 'CRITICAL',
        classification: 'CONSTRAINT_VIOLATION',
        previousValue: formatINR(oldBudgetPaise),
        proposedValue: formatINR(newBudgetPaise),
        requiredUserAction:
          'Review budget categories and reduce allocations to balance budget under new ceiling.',
        automaticChangeAllowed: false,
        ruleId: 'RULE_BUDGET_DEFICIT',
        proposedAction: null,
      });
    } else if (newRemaining > 0) {
      findings.push({
        id: `find_budget_surplus_${snapshot.budget.id}`,
        eventId: snapshot.event.id,
        changeType: 'TOTAL_BUDGET',
        entityType: 'EVENT_BUDGET',
        entityId: snapshot.budget.id,
        title: `Unallocated budget reserve: ${formatINR(newRemaining)}`,
        reason: `Increasing budget to ${formatINR(
          newBudgetPaise
        )} provides an unallocated reserve of ${formatINR(newRemaining)} (distributable category ceiling: ${formatINR(
          newAvailable
        )}, plus ${formatINR(newContingency)} for contingency).`,
        severity: 'INFO',
        classification: 'INFO',
        previousValue: formatINR(oldBudgetPaise),
        proposedValue: formatINR(newBudgetPaise),
        requiredUserAction: 'Optionally distribute additional funds to priority categories.',
        automaticChangeAllowed: false,
        ruleId: 'RULE_BUDGET_SURPLUS',
        proposedAction: null,
      });
    }
  }

  // =========================================================================
  // 4. VENUE / LOCATION IMPACT RULES
  // =========================================================================
  if (newCity && newCity.toLowerCase().trim() !== oldCity.toLowerCase().trim()) {
    findings.push({
      id: `find_city_relocation_${snapshot.event.id}`,
      eventId: snapshot.event.id,
      changeType: 'VENUE',
      entityType: 'VENUE',
      entityId: snapshot.event.id,
      title: `City relocation: ${oldCity} → ${newCity}`,
      reason: `Relocating event to ${newCity} impacts local vendor agreements, guest transport/lodging logistics, and city permissions.`,
      severity: 'WARNING',
      classification: 'NEEDS_REVIEW',
      previousValue: oldCity,
      proposedValue: newCity,
      requiredUserAction: `Re-confirm vendor coverage and travel logistics in ${newCity}.`,
      automaticChangeAllowed: false,
      ruleId: 'RULE_VENUE_LOCATION',
      proposedAction: null,
    });
  }

  const calculatedCount = findings.filter((f) => f.classification === 'CALCULATED_CHANGE').length;
  const reviewCount = findings.filter((f) => f.classification === 'NEEDS_REVIEW').length;
  const criticalCount = findings.filter(
    (f) => f.severity === 'CRITICAL' || f.classification === 'CONSTRAINT_VIOLATION'
  ).length;

  return {
    previewId,
    eventId: snapshot.event.id,
    sourceVersion: snapshot.event.version ?? 1,
    changeType,
    currentValues: {
      targetGuestCount: oldGuests,
      startDate: oldStart,
      endDate: oldEnd,
      totalBudgetPaise: oldBudgetPaise,
      venueName: oldVenueName,
      venueCity: oldCity,
    },
    proposedValues: {
      targetGuestCount: newGuests,
      startDate: newStart,
      endDate: newEnd,
      totalBudgetPaise: newBudgetPaise,
      venueName: newVenueName,
      venueCity: newCity,
    },
    findings,
    summary: {
      totalFindings: findings.length,
      calculatedCount,
      reviewCount,
      criticalCount,
    },
    createdAt: new Date().toISOString(),
  };
}
