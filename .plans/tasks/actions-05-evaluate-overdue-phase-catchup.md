---
status: done
area: dev
priority: p1
---

# Add locked overdue phase draining

## Problem

Multiphase actions can preserve their planned timing, but overdue work still advances one phase per Action Scheduler run. A route jump that should have completed hours ago may move one hop when the player returns, then wait for the next scheduler pass before moving again. This feels broken even when the stored `deferred_until` values are correct.

The current lifecycle releases `processing_at` after every non-final phase so the queue can claim the action later. That makes each phase a separate queue turn. It also spreads catch-up behavior across the resolver and repository claim path instead of making the processor responsible for draining work that is already due.

## Proposed solution

Make action processing drain overdue phases while the action remains claimed. After a ready action is claimed, the processor should keep the processing lock while it resolves, saves, and broadcasts each due phase. If the resolver leaves the action non-final with a `deferred_until` that is still due, the processor should immediately resolve the next phase in the same processing pass. If the action is final, failed, future-dated, or hits a safety guard, the processor should stop and release or finish the action as appropriate.

Resolvers should continue to resolve one phase at a time. They should express domain progress by mutating the action, ship state, and components. They should not decide whether overdue phases should continue draining. That decision belongs to the processor because it owns queue readiness, processing locks, retry safety, and batch limits.

Persist progress after every phase before continuing to the next one. This preserves completed phase state if a later phase fails or throws. A failure after several caught-up phases should keep the earlier phase results and ship movement instead of rolling the entire catch-up pass back to the first phase.

Do not release `processing_at` just because a multiphase action is non-final. Release it only when the action is waiting for a future phase or has reached a terminal state. While an overdue action is being drained, the existing lock should prevent another worker from claiming the same action.

Broadcast each saved phase so clients can observe intermediate progress. Processing behavior should be driven by `status`, `processing_at`, and `deferred_until`, not by a separate broadcast marker.

## Requirements

-   A fully overdue multi-hop jump drains all due legs in one processor pass.
-   A multiphase action stops draining when its next `deferred_until` is in the future.
-   A final action clears the ship's `current_action_id` and releases the processing lock.
-   A future-dated non-final action keeps the ship's `current_action_id` and releases the processing lock for a later claim.
-   Each resolved phase is persisted before the next overdue phase is attempted.
-   Each resolved phase dispatches the normal action and ship state update events.
-   Catch-up draining has a per-action safety guard to prevent infinite loops.
-   The processor, not individual resolvers, owns the decision to keep draining overdue phases.
-   Tests cover a route jump with at least five overdue hops completing in one `processReady()` call.
-   Tests cover an overdue route jump that drains one due hop and stops when the following hop is future-dated.
