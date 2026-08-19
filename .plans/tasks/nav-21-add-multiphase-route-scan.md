---
status: ready
area: navigation
priority: p2
depends_on:
    - actions-03-standardize-multiphase-processing
    - actions-06-store-private-action-state
---

# Add multiphase route scan

## Problem

Route scans need private execution bookkeeping and public discoveries at the
same time. Moving bookkeeping out of `result` must not remove continuation
through discovered waypoints or hide discoveries until the action finishes.

A scan should reveal each discovered connection as it happens, without exposing
continuation rolls, probabilities, private misses, or future outcomes. Its
params describe the original command; its runtime state tracks where execution
resumes; its result accumulates the public route.

## Proposed solution

Keep `scan_route` a first-class multiphase action, with the action row as the
scheduler and public lifecycle record, and move all private cycle bookkeeping
into the action's private runtime state from
`actions-06-store-private-action-state`.

Action params should describe the stable scan intent. The `from_node_id`
should be captured from the ship's current position by the action creation
pipeline rather than supplied by the UI. Starting a scan should validate that
the source and target nodes exist and that the target is within supported
scan range.

The private runtime state should hold everything needed to resume the scan at
the next checkpoint, including the current scan source, discovered hop depth,
cycle index, cycle timing, private misses, and continuation rolls. It should store only anchors and history, never precomputed future
outcomes. Each cycle should be resolved against live ship state when its
checkpoint is processed, so ship condition, skills, and capabilities that
change mid-scan affect the remaining cycles. When overdue checkpoints are
drained in one pass, the drained cycles resolve against current ship state,
matching the catch-up behavior jumps already use. A no-discovery cycle should
record private state, keep the action non-final, and schedule the next
checkpoint. A discovery cycle should upsert the discovered edge for the ship
owner and immediately append the public connection to `result`. A waypoint can
advance the private scan source and schedule another cycle if the continuation
roll permits. Reaching the target fulfills the action. Stopping continuation,
revisiting a node, or exhausting the cycle limit ends the scan as partial when
it has discoveries. Exhausting attempts with no discoveries remains fulfilled
with empty discovery arrays. Params retain the original origin and target.

The public result should expose route data directly on the result, not nested
under a `route_scan` key, and should not duplicate summaries that clients can
derive from params, path, and action status. Internal rolls, probabilities,
cycle logs, and scan bookkeeping must not appear in the public result, REST
resources, or broadcasts.

Do not keep a separate legacy one-pass route scan path. The domain scan logic
should expose checkpoint-oriented behavior, and the action resolver should
adapt that behavior to the shared action lifecycle.

## Requirements

-   `scan_route` must always use the multiphase action lifecycle, even when a
    scan discovers a route on the first cycle.
-   Scan action params must hold only the stable scan intent, with
    `from_node_id` captured from the ship's position at creation time.
-   Starting a scan must validate that the source and target nodes exist and
    that the target is within supported scan range.
-   Private cycle state must live in the action's private runtime state, not
    in `ship_action.result` and not in ship state.
-   Private runtime state must hold only anchors and history. Cycle outcomes
    must be calculated at checkpoint time against live ship state, never
    precomputed at creation.
-   Route scan cycles must use a fixed 5 minute cycle for now.
-   `deferred_until` must mean the next scan update checkpoint, not the known
    completion time for the whole scan.
-   Each next checkpoint must be calculated from the scan start time plus
    `cycle_length * cycle_number`, not from processor runtime.
-   A no-discovery cycle must keep the action non-final, record private
    runtime state, and schedule the next checkpoint.
-   A discovery cycle must upsert the discovered edge for the ship owner
    and append public results at that checkpoint, even if scanning continues.
-   A direct target discovery must fulfill the action; a waypoint discovery
    may continue scanning from that waypoint. Partial is a terminal outcome.
-   The public result must accumulate discoveries while running and must not
    contain rolls, probabilities, cycle logs, or resume bookkeeping.
-   Terminal states retain private runtime state on the action row for
    debugging, including the final cycle outcome and continuation decision.
    Terminal action status must prevent retained state from resuming execution.
-   Overdue scans must benefit from shared action drain behavior by resolving
    due checkpoints until the scan is final or the next checkpoint is in the
    future.
-   Tests must cover intent validation, private state persisting across due
    checkpoints, private state staying out of public resources, no-discovery
    continuation, multiple discoveries with persistence between checkpoints,
    discovery fulfillment, terminal limits, discovered edge persistence, and
    claiming the scan again after the next `deferred_until`.
