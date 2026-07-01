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

Route scans now run as multiphase actions, but the resolver keeps its private
bookkeeping in the public action result. `result['phases']` records the
continuation roll, the effective continuation probability, and per-cycle
internals, and the resolver reads its own resume state back out of that public
result on every checkpoint. That leaks scan mechanics the player should never
see, couples resume logic to the public serialization, and makes the result
contract unstable while the scan is still running.

A route scan should not reveal up front how long it will take to find a
result. The player should only see the current scan action and the next scan
update checkpoint. The private details used to decide whether a cycle
discovered a route belong to the running action's private runtime state, not
to `ship_action.params` or the public `ship_action.result`.

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
the next checkpoint, including cycle index, cycle timing, and private miss
records. It should store only anchors and history, never precomputed future
outcomes. Each cycle should be resolved against live ship state when its
checkpoint is processed, so ship condition, skills, and capabilities that
change mid-scan affect the remaining cycles. When overdue checkpoints are
drained in one pass, the drained cycles resolve against current ship state,
matching the catch-up behavior jumps already use. A no-discovery cycle should
record private state, keep the action non-final, and schedule the next
checkpoint. A discovery cycle should upsert
the discovered edge for the ship owner, then finish the action with only the
public outcome on `result`. A direct edge to the target should fulfill the
action; a waypoint discovery should finish it in the final `partial` status.

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
    before finalizing the action.
-   A direct target discovery must fulfill the action; a waypoint discovery
    must finish it as partial.
-   The public result must be written only at final states and must not
    contain rolls, probabilities, cycle logs, or resume bookkeeping.
-   Terminal states must not leave orphaned scan progress anywhere outside
    the action row.
-   Overdue scans must benefit from shared action drain behavior by resolving
    due checkpoints until the scan is final or the next checkpoint is in the
    future.
-   Tests must cover intent validation, private state persisting across due
    checkpoints, private state staying out of public resources, no-discovery
    continuation, discovery fulfillment, discovered edge persistence, and
    claiming the scan again after the next `deferred_until`.
