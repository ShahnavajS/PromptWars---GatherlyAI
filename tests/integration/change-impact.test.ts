import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateChangePreview,
  confirmAndApplyChange,
  getEventHistory,
  StalePreviewConflictError,
  UnauthorizedEventError,
} from '@/lib/services/changeImpactService';
import { createEvent, getEventById } from '@/lib/services/eventService';
import { getRawSqlite } from '@/lib/db';

describe('Change-Impact & Stale State Concurrency (Integration Tests)', () => {
  beforeEach(() => {
    const rawSqlite = getRawSqlite();
    rawSqlite.exec(`
      DELETE FROM event_activities;
      DELETE FROM ai_plan_suggestions;
      DELETE FROM event_tasks;
      DELETE FROM budget_categories;
      DELETE FROM event_budgets;
      DELETE FROM events;
    `);
  });

  it('generates preview without mutating the database', async () => {
    const initialDetail = await createEvent({
      title: 'Preview Invariant Wedding',
      eventType: 'WEDDING',
      startDate: '2026-11-20',
      venueCity: 'Ahmedabad',
      targetGuestCount: 200,
      totalBudgetRupees: 1200000,
    });

    const preview = await generateChangePreview(
      initialDetail.event.id,
      {
        changeType: 'GUEST_COUNT',
        proposedChanges: { targetGuestCount: 300 },
      },
      'usr_demo'
    );

    expect(preview.findings.length).toBeGreaterThan(0);
    expect(preview.proposedValues.targetGuestCount).toBe(300);

    // Database state must be 100% UNTOUCHED
    const checkEvent = (await getEventById(initialDetail.event.id, 'usr_demo'))!;
    expect(checkEvent.event.targetGuestCount).toBe(200);
    expect(checkEvent.event.version).toBe(1);
  });

  it('confirms and applies primary change and authorized side-effects in an atomic transaction', async () => {
    const initialDetail = await createEvent({
      title: 'Atomic Confirmation Wedding',
      eventType: 'WEDDING',
      startDate: '2026-11-20',
      venueCity: 'Ahmedabad',
      targetGuestCount: 200,
      totalBudgetRupees: 1200000,
    });

    const preview = await generateChangePreview(
      initialDetail.event.id,
      {
        changeType: 'GUEST_COUNT',
        proposedChanges: { targetGuestCount: 250 },
      },
      'usr_demo'
    );

    const cateringFinding = preview.findings.find(
      (f) => f.ruleId === 'RULE_GUEST_CATERING' && f.proposedAction
    );
    expect(cateringFinding).toBeDefined();
    const approvedActionId = cateringFinding!.proposedAction!.id;

    // Confirm with approved action
    const result = await confirmAndApplyChange(
      initialDetail.event.id,
      {
        previewId: preview.previewId,
        sourceVersion: preview.sourceVersion,
        changeType: 'GUEST_COUNT',
        proposedChanges: { targetGuestCount: 250 },
        approvedActionIds: [approvedActionId],
      },
      'usr_demo'
    );

    expect(result.success).toBe(true);
    expect(result.event.event.targetGuestCount).toBe(250);
    expect(result.event.event.version).toBe(2);

    // Check catering category updated
    const updatedCatering = result.event.categories.find((c) => c.id === cateringFinding!.entityId);
    if (cateringFinding?.proposedAction?.type === 'ADJUST_CATEGORY_ALLOCATION') {
      expect(updatedCatering?.allocatedPaise).toBe(cateringFinding.proposedAction.proposedPaise);
    }

    // Verify activity record was inserted
    const history = await getEventHistory(initialDetail.event.id, 'usr_demo');
    expect(history.length).toBe(2); // Initial creation + Guest count change
    expect(history[0].actionType).toBe('GUEST_COUNT_CHANGED');
    expect(history[0].changeSummary).toContain('Guest count changed from 200 to 250');
  });

  it('does NOT apply side-effects if user does not explicitly approve them', async () => {
    const initialDetail = await createEvent({
      title: 'Unapproved Side-Effects Event',
      eventType: 'WEDDING',
      startDate: '2026-11-20',
      venueCity: 'Ahmedabad',
      targetGuestCount: 200,
      totalBudgetRupees: 1200000,
    });

    const originalCatering = initialDetail.categories.find((c) =>
      c.name.includes('Catering')
    )!.allocatedPaise;

    const preview = await generateChangePreview(
      initialDetail.event.id,
      {
        changeType: 'GUEST_COUNT',
        proposedChanges: { targetGuestCount: 250 },
      },
      'usr_demo'
    );

    // User confirms change WITHOUT approving side-effects
    const result = await confirmAndApplyChange(
      initialDetail.event.id,
      {
        previewId: preview.previewId,
        sourceVersion: preview.sourceVersion,
        changeType: 'GUEST_COUNT',
        proposedChanges: { targetGuestCount: 250 },
        approvedActionIds: [], // Empty!
      },
      'usr_demo'
    );

    expect(result.event.event.targetGuestCount).toBe(250);

    // Catering category allocation MUST REMAIN UNCHANGED
    const cateringAfter = result.event.categories.find((c) =>
      c.name.includes('Catering')
    )!.allocatedPaise;
    expect(cateringAfter).toBe(originalCatering);
  });

  it('rejects stale previews with StalePreviewConflictError (optimistic concurrency)', async () => {
    const initialDetail = await createEvent({
      title: 'Concurrency Test Event',
      eventType: 'WEDDING',
      startDate: '2026-11-20',
      venueCity: 'Ahmedabad',
      targetGuestCount: 200,
      totalBudgetRupees: 1200000,
    });

    // 1. Client A generates preview based on version 1
    const previewA = await generateChangePreview(
      initialDetail.event.id,
      {
        changeType: 'GUEST_COUNT',
        proposedChanges: { targetGuestCount: 250 },
      },
      'usr_demo'
    );

    // 2. Client B modifies the event in the interim (version increments to 2)
    await confirmAndApplyChange(
      initialDetail.event.id,
      {
        previewId: 'prv_interim',
        sourceVersion: 1,
        changeType: 'VENUE',
        proposedChanges: { venueCity: 'Vadodara' },
        approvedActionIds: [],
      },
      'usr_demo'
    );

    // 3. Client A attempts to confirm their stale preview based on version 1
    await expect(
      confirmAndApplyChange(
        initialDetail.event.id,
        {
          previewId: previewA.previewId,
          sourceVersion: previewA.sourceVersion, // Stale version 1!
          changeType: 'GUEST_COUNT',
          proposedChanges: { targetGuestCount: 250 },
          approvedActionIds: [],
        },
        'usr_demo'
      )
    ).rejects.toThrow(StalePreviewConflictError);

    // Verify interim state was preserved
    const finalDetail = (await getEventById(initialDetail.event.id, 'usr_demo'))!;
    expect(finalDetail.event.venueCity).toBe('Vadodara');
    expect(finalDetail.event.targetGuestCount).toBe(200); // Not overwritten by stale Client A
  });

  it('blocks unauthorized users from generating preview, confirming, or reading history', async () => {
    const detail = await createEvent(
      {
        title: 'Private Event Owner',
        eventType: 'WEDDING',
        startDate: '2026-11-20',
        venueCity: 'Ahmedabad',
        targetGuestCount: 200,
        totalBudgetRupees: 1200000,
      },
      'usr_legit_owner'
    );

    // Attacker tries to generate preview
    await expect(
      generateChangePreview(
        detail.event.id,
        {
          changeType: 'GUEST_COUNT',
          proposedChanges: { targetGuestCount: 500 },
        },
        'usr_attacker'
      )
    ).rejects.toThrow(UnauthorizedEventError);

    // Attacker tries to confirm changes
    await expect(
      confirmAndApplyChange(
        detail.event.id,
        {
          previewId: 'prv_fake',
          sourceVersion: 1,
          changeType: 'GUEST_COUNT',
          proposedChanges: { targetGuestCount: 500 },
        },
        'usr_attacker'
      )
    ).rejects.toThrow(UnauthorizedEventError);

    // Attacker tries to read activity history
    await expect(getEventHistory(detail.event.id, 'usr_attacker')).rejects.toThrow(
      UnauthorizedEventError
    );
  });
});
