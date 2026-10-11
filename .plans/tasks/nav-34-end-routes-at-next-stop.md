---
status: draft
area: navigation
priority: p2
depends_on:
    - nav-33-add-immediate-scan-stopping
---

# End jump routes at the next stop

## Problem

The active jump card shows a Cancel button without an implemented operation.
Players need to shorten a multileg itinerary without aborting a jump in transit.
An immediate cancellation would misrepresent the ship's position and discard
travel that is already underway.

## Proposed solution

Use the shared action cancellation endpoint and dispatch contract introduced by
[Stop scan](nav-33-add-immediate-scan-stopping.md). Give jump actions their own
cancellation behavior. Accept a request to end the route after the current leg,
while leaving that leg active and preserving its normal duration, resource
costs, arrival effects, and failure handling. Never teleport the ship or abort
an in-progress jump.

Persist the request so it survives reloads, worker restarts, and retries. Expose
the pending stop and intended stopping node in the public action. Keep the
ship's action slot occupied until the current leg finishes. On arrival, omit
all remaining legs and their costs, record the player-requested early ending,
retain completed travel, and release the slot. Preserve the original requested
itinerary so the final card can distinguish traveled and untraveled segments.

Define boundary behavior for a request before travel starts, during the last
leg, after completion, and while a worker processes an arrival. Account for
overdue checkpoint catch-up when selecting the current leg and stopping node.
Do not promise a stop that elapsed travel has already passed, and do not let a
worker drain past an accepted stop into another leg. Repeated requests must not
move the stopping point or duplicate effects. A failed current leg remains a
failure rather than being relabeled a successful cancellation.

Use **Abort route** as the compact card control, with supporting text such as
"Finish the current jump, then stop at the next waypoint." After acceptance,
show **Stopping at {node}**, retain the current-leg countdown and progress, and
mark later legs as no longer planned for travel. Do not display the route as
ended until arrival is confirmed. Handle submission errors and duplicate clicks
separately from the accepted, pending-stop state. Keep all clients synchronized
through the existing action and ship updates.

Cover the shared API response for deferred cancellation and its transition to a
final outcome. Test pending travel, multileg travel, the final leg, repeated and
late requests, ownership, current-leg failure, and cancellation racing overdue
processing. Simulator coverage must verify arrival at the chosen stop, preserved
current-leg costs, no later-leg charges, and correct action-slot release. Add
card stories and tests for requesting, stopping on arrival, request failure,
and the final shortened itinerary.
