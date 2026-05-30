---
status: done
area: dev
priority: p2
---

# Add multiphase action lifecycle

## Problem

Ship actions currently resolve as one deferred operation. `claimReady()` can
pick up a pending action after `deferred_until`, but `ActionResolver` fulfills
every action after one resolver pass and clears the ship's `current_action_id`.
That prevents one action from making partial progress, broadcasting that
progress, and scheduling its next phase while keeping the ship busy.

This blocks route-aware jumps and other asynchronous mechanics described in the
older action design docs. `docs/plans/envelopes.md` treats `deferred_until` as
the next action phase rather than final completion, and `docs/plans/queue.md`
describes releasing an action back to the queue for later processing. The PHP
action lifecycle needs that generic capability before individual actions can
rely on multiple phases.

## Proposed solution

Extend the ShipLink action lifecycle so action status determines whether a
resolver pass is terminal. Add an `isFinalState()` style status check. After a
resolver runs, the shared resolver should inspect the action. If the action is
in a final state, it should persist the terminal result and clear the ship's
current action. If the action is still non-final, it should persist the updated
state and result, update `broadcast_at`, clear the processing lock, keep the
action `running`, and leave `current_action_id` assigned to the same action.

Multiphase action state should use `result.phases` as the conventional storage
location for phase steps and phase metadata. Individual action types can define
their own phase payload shape, but shared lifecycle code and UI consumers should
be able to look under `result.phases` for the ordered phases, current phase, and
progress data needed to resume or display the action.

Keep this lifecycle generic. Route-aware jumps should be only the first
consumer, not the special case that defines the abstraction. The new contract
should be usable later by scan sweep phases, drive cooldown, interdiction, and
other action phases.

The implementation should preserve the current single phase action behavior by
default. Existing resolvers that complete in one pass should not need to know
about multiphase behavior unless they opt in. Multiphase action types should be
able to rely on their resolver to set the action's final or non-final state. The
action queue and simulation repositories should both support claiming phase-ready
running actions after their next `deferred_until`, without treating every
running action as ready.

## Requirements

-   Add an `isFinalState()` style status API for action statuses.
-   Action resolution must inspect the action status after the type-specific
    resolver runs instead of always fulfilling the action.
-   Existing one-pass actions must keep their current auto-fulfillment behavior.
-   Multiphase action types must be able to opt out of auto-fulfillment and rely
    on their resolver to set final or non-final status.
-   Multiphase action types must store phase steps and phase metadata under
    `result.phases`.
-   A non-final phase must leave the action `running` with a future
    `deferred_until`.
-   The shared action resolver lifecycle must clear `processing_at` for a
    non-final phase so the action can be claimed again when ready.
-   The shared action resolver lifecycle must update `broadcast_at` for a
    non-final phase so clients can receive intermediate progress.
-   The shared action resolver lifecycle must keep the ship's
    `current_action_id` set to the action for a non-final phase.
-   Terminal fulfilled, partial, and failed outcomes must continue to clear the
    ship's `current_action_id`.
-   The production and memory action repositories must both support the
    multiphase lifecycle.
-   The queue must distinguish actively processing running actions from
    phase-waiting running actions by using `processing_at`.
-   Tests must cover a resolver that completes across multiple passes, keeps the
    ship busy and running between passes, broadcasts intermediate state, is
    claimed again after the next `deferred_until`, and clears the ship only
    after a terminal outcome.
