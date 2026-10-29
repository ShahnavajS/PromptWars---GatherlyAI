import { getDb, getRawSqlite } from '@/lib/db';
import { events, eventBudgets, budgetCategories, eventTasks, eventActivities } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getEventById, EventDetail } from './eventService';
import {
  ChangePreviewRequest,
  ChangeConfirmRequest,
  ImpactPreviewResult,
  ProposedSideEffectAction,
} from '@/lib/domain/impact/schemas';
import { evaluateChangeImpact } from '@/lib/domain/impact/engine';
import { calculateContingencyAmount } from '@/lib/domain/budget';
import crypto from 'crypto';

export class StalePreviewConflictError extends Error {
  constructor(message = 'Event was modified since preview was generated. Please refresh and review updated impacts.') {
    super(message);
    this.name = 'StalePreviewConflictError';
  }
}

export class UnauthorizedEventError extends Error {
  constructor(message = 'Event not found or unauthorized.') {
    super(message);
    this.name = 'UnauthorizedEventError';
  }
}

/**
 * Generates an explainable preview of proposed event requirement changes.
 * INVARIANT: Never mutates the database.
 */
export async function generateChangePreview(
  eventId: string,
  request: ChangePreviewRequest,
  userId = 'usr_demo'
): Promise<ImpactPreviewResult> {
  const currentSnapshot = await getEventById(eventId, userId);
  if (!currentSnapshot) {
    throw new UnauthorizedEventError();
  }

  return evaluateChangeImpact(currentSnapshot, request.proposedChanges, request.changeType);
}

/**
 * Confirms and atomically applies an authorized change preview.
 * Verifies optimistic concurrency and executes in an atomic SQLite transaction.
 */
export async function confirmAndApplyChange(
  eventId: string,
  request: ChangeConfirmRequest,
  userId = 'usr_demo'
): Promise<{ success: boolean; event: EventDetail; activityId: string }> {
  const db = getDb();
  const rawSqlite = getRawSqlite();

  // 1. Verify ownership and load latest state
  const currentSnapshot = await getEventById(eventId, userId);
  if (!currentSnapshot) {
    throw new UnauthorizedEventError();
  }

  // 2. Concurrency Check: Stale Preview Detection
  const currentVersion = currentSnapshot.event.version ?? 1;
  if (currentVersion !== request.sourceVersion) {
    throw new StalePreviewConflictError();
  }

  // 3. Re-evaluate impact rules against trusted current state
  const freshPreview = evaluateChangeImpact(
    currentSnapshot,
    request.proposedChanges,
    request.changeType
  );

  // 4. Identify authorized side-effects
  const approvedActionIdsSet = new Set(request.approvedActionIds || []);
  const authorizedActionsToApply: ProposedSideEffectAction[] = [];

  freshPreview.findings.forEach((finding) => {
    if (
      finding.automaticChangeAllowed &&
      finding.proposedAction &&
      approvedActionIdsSet.has(finding.proposedAction.id)
    ) {
      authorizedActionsToApply.push(finding.proposedAction);
    }
  });

  const now = new Date().toISOString();
  const nextVersion = currentVersion + 1;
  const activityId = `act_${crypto.randomUUID()}`;

  // 5. Execute in atomic SQLite transaction
  const executeTransaction = rawSqlite.transaction(() => {
    // A. Update primary event fields
    const eventUpdateValues: Record<string, unknown> = {
      version: nextVersion,
      updatedAt: now,
    };

    if (request.proposedChanges.targetGuestCount !== undefined) {
      eventUpdateValues.targetGuestCount = request.proposedChanges.targetGuestCount;
    }
    if (request.proposedChanges.startDate !== undefined) {
      eventUpdateValues.startDate = request.proposedChanges.startDate;
    }
    if (request.proposedChanges.endDate !== undefined) {
      eventUpdateValues.endDate = request.proposedChanges.endDate;
    }
    if (request.proposedChanges.venueName !== undefined) {
      eventUpdateValues.venueName = request.proposedChanges.venueName;
    }
    if (request.proposedChanges.venueCity !== undefined) {
      eventUpdateValues.venueCity = request.proposedChanges.venueCity;
    }

    db.update(events)
      .set(eventUpdateValues)
      .where(and(eq(events.id, eventId), eq(events.userId, userId)))
      .run();

    // B. Update budget ceiling & contingency if total budget changed
    if (request.proposedChanges.totalBudgetRupees !== undefined) {
      const newTotalPaise = request.proposedChanges.totalBudgetRupees * 100;
      const newContingencyPaise = calculateContingencyAmount(newTotalPaise, 10);

      db.update(eventBudgets)
        .set({
          totalBudgetPaise: newTotalPaise,
          contingencyPaise: newContingencyPaise,
          updatedAt: now,
        })
        .where(eq(eventBudgets.eventId, eventId))
        .run();
    }

    // C. Apply approved side-effects
    authorizedActionsToApply.forEach((action) => {
      if (action.type === 'ADJUST_CATEGORY_ALLOCATION') {
        db.update(budgetCategories)
          .set({
            allocatedPaise: action.proposedPaise,
            updatedAt: now,
          })
          .where(and(eq(budgetCategories.id, action.categoryId), eq(budgetCategories.eventId, eventId)))
          .run();
      } else if (action.type === 'SHIFT_TASK_DUE_DATE') {
        db.update(eventTasks)
          .set({
            dueDate: action.proposedDueDate,
            updatedAt: now,
          })
          .where(and(eq(eventTasks.id, action.taskId), eq(eventTasks.eventId, eventId)))
          .run();
      }
    });

    // D. Build human-readable change summary
    const summaryParts: string[] = [];
    if (request.proposedChanges.targetGuestCount !== undefined) {
      summaryParts.push(
        `Guest count changed from ${currentSnapshot.event.targetGuestCount} to ${request.proposedChanges.targetGuestCount}`
      );
    }
    if (request.proposedChanges.startDate !== undefined) {
      summaryParts.push(
        `Start date changed from ${currentSnapshot.event.startDate} to ${request.proposedChanges.startDate}`
      );
    }
    if (request.proposedChanges.endDate !== undefined) {
      summaryParts.push(
        `End date changed from ${currentSnapshot.event.endDate || 'None'} to ${request.proposedChanges.endDate || 'None'}`
      );
    }
    if (request.proposedChanges.totalBudgetRupees !== undefined) {
      summaryParts.push(`Total budget updated to ₹${request.proposedChanges.totalBudgetRupees.toLocaleString('en-IN')}`);
    }
    if (request.proposedChanges.venueCity !== undefined) {
      summaryParts.push(`City changed to ${request.proposedChanges.venueCity}`);
    }
    if (authorizedActionsToApply.length > 0) {
      summaryParts.push(`Applied ${authorizedActionsToApply.length} approved side-effect adjustments`);
    }

    const changeSummary = summaryParts.join('. ') + '.';

    // E. Record provenance into event_activities
    db.insert(eventActivities)
      .values({
        id: activityId,
        eventId,
        actorId: userId,
        actionType: `${request.changeType}_CHANGED`,
        entityType: 'EVENT',
        entityId: eventId,
        changeSummary,
        previousValuesJson: JSON.stringify(freshPreview.currentValues),
        newValuesJson: JSON.stringify(freshPreview.proposedValues),
        findingsSummaryJson: JSON.stringify(freshPreview.summary),
        approvedActionsJson: JSON.stringify(authorizedActionsToApply),
        createdAt: now,
      })
      .run();
  });

  executeTransaction();

  const updatedDetail = await getEventById(eventId, userId);
  if (!updatedDetail) {
    throw new Error('Failed to retrieve updated event detail.');
  }

  return {
    success: true,
    event: updatedDetail,
    activityId,
  };
}

/**
 * Retrieves audit history of requirement changes for an event.
 */
export async function getEventHistory(eventId: string, userId = 'usr_demo') {
  const db = getDb();

  // Ownership verification
  const eventDetail = await getEventById(eventId, userId);
  if (!eventDetail) {
    throw new UnauthorizedEventError();
  }

  return db
    .select()
    .from(eventActivities)
    .where(eq(eventActivities.eventId, eventId))
    .orderBy(desc(eventActivities.createdAt))
    .all();
}
