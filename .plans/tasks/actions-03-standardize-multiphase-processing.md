---
status: done
area: dev
priority: p1
---

# Standardize multiphase action processing

## Problem

Multiphase actions do not have a clear processing contract. A resolver can leave an action non-final with a new `deferred_until`, but the action processor treats that as one completed unit of work and waits for a later queue pass. When processing is late, the next phase may be scheduled from processing time instead of game time, which stretches long-running actions.

## Proposed solution

Define the shared convention for multiphase actions. A resolver may continue to handle only one phase. When more elapsed phases are due, it should leave the action non-final with a backdated `deferred_until` so the normal queue claim path can pick it up immediately on a later pass.

Keep the queue model authoritative. Resolvers should report phase progress and the next due time; shared action lifecycle code should own claiming, releasing, broadcasts, retry safety, and final-state cleanup.

## Developer notes

For multiphase timing, do not add extra persisted timeline fields unless a later UI or audit need requires them. The action row remains the scheduler record:

- `deferred_until` is the scheduled due time for the phase or cycle currently being resolved.
- Non-final actions keep the ship busy through `current_action_id` until the action reaches a final state.
- Resolvers should calculate the next `deferred_until` from the prior due-time anchor, not from processing time.

For actions whose progress is public action state, such as jumps, `result['phases']` can record the completed phases. For actions whose progress is private, such as route scans, the private cycle bookkeeping belongs in the action's private runtime state, tracked in `actions-06-store-private-action-state.md`, and only the public outcome belongs in `result`.

When a resolver completes one phase and schedules the next, calculate the next `deferred_until` from the prior due-time anchor, not from processing time. For example, jump should use the action's current `deferred_until` before overwriting it:

```php
$phaseDueAt = $action->deferred_until ?? Date::now();

// Complete the current phase...

$nextDuration = $ship->propulsion()->getJumpDuration($nextEdge->distance);
$action->deferred_until = Date::addSeconds($phaseDueAt, $nextDuration);
```

This keeps late processing from stretching long routes. If a phase was due at 10:00 but the processor runs at 14:00, a two-hour next phase should be due at 12:00, not 16:00. This task keeps catch-up behavior to one phase per processor claim; evaluating same-pass draining belongs in `actions-05-evaluate-overdue-phase-catchup.md`.

## Outcome

The convention is implemented for multiphase action processing. Jump records public progress under `result['phases']` and anchors each next `deferred_until` to the prior due time. Route scan uses the same scheduling lifecycle. Shared lifecycle code owns claiming, releasing, broadcasts, and final-state cleanup, and `actions-05` added same-pass draining of overdue phases on top of this contract. Moving route scan's private cycle bookkeeping out of the public result is follow-up work under `actions-06-store-private-action-state.md` and `nav-21-add-multiphase-route-scan.md`.
