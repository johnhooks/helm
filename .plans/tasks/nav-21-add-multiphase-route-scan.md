---
status: ready
area: navigation
priority: p2
depends_on:
    - actions-03-standardize-multiphase-processing
---

# Add multiphase route scan

## Problem

Route scans already have the design concept of discovering more than one hop.
`docs/navigation.md` describes scans that can reveal 1 to N waypoints, and the
current PHP scan computer rolls after each waypoint to decide whether discovery
continues. That logic runs inside one resolver pass today, so a long route scan
returns all discovered hops at once after a single wait.

That makes route scanning less legible than the rest of Helm's asynchronous
action model. Finding a waypoint should be meaningful intermediate progress.
The player should be able to see that the scan reached a waypoint, recorded the
new edge, and is now trying to push deeper toward the target with a lower
chance of continuing. The existing one-pass result hides those checkpoints and
makes multi-hop discovery hard to broadcast, resume, or explain.

## Proposed solution

Make `scan_route` a first-class multiphase action. Every route scan should use
this lifecycle, including scans that finish after one phase because they fail,
stop after one discovered waypoint, or find a direct edge to the target. The scan
action params should continue to describe the scan intent, including the source
node, target node, distance, effort, and any scan tuning. The scan result should
use `result.phases` to record each route scan phase, including the starting node
for that phase, the node or edge discovered,
the roll used to decide whether scanning continues, the effective continuation
probability, and whether the phase completed the route, stopped partially, or
failed.

Each successful waypoint discovery should persist the discovered waypoint and
edge immediately, update the action result, then roll to decide whether the
scan continues toward the original target. The continuation probability should
decrease by hop depth, using the same diminishing return concept already
documented for multi-hop scanning. If the continuation roll succeeds, the
resolver should schedule the next scan phase from the newly discovered waypoint
toward the original target and leave the action non-final. For now, route scan
phases should use a fixed 5 minute scan cycle. `deferred_until` should represent
the next scan update checkpoint, not a projected final result time, because the
system does not know whether another waypoint exists until the current phase
resolves and passes its continuation roll. Each next checkpoint should be
scheduled from the original scan start time plus `cycle_length * phase_number`,
not from the current processing time, so late processors do not stretch the scan.
This should work with the shared action drain behavior: if multiple scan
checkpoints are already due, the processor may resolve them one phase at a time
until the scan becomes final or schedules a future checkpoint. If the roll fails,
the action should finish as a partial scan with the discoveries made so far.

Do not keep a separate legacy one-pass route scan path. The domain scan logic
should expose phase-oriented behavior, and the action resolver should be the
place where phases are accumulated into the action result.

The generic action resolver lifecycle should own the non-final bookkeeping
between phases. The route scan resolver should focus on scan domain decisions:
which waypoint or direct edge is discovered next, how the continuation
probability is calculated, what phase result is recorded, and whether the scan
is fulfilled, partial, or failed.

## Requirements

-   `scan_route` must always use the multiphase action lifecycle, even when the
    scan finishes after a single phase.
-   Scan action params must keep the original scan intent separate from phase
    results.
-   Route scan phase results must be recorded under `result.phases`.
-   Each phase must record enough information to explain and resume the scan,
    including source node, target node, discovered node or edge ids, hop depth,
    continuation probability, and continuation roll when applicable.
-   A phase that discovers a waypoint must persist the waypoint and edge before
    deciding whether to continue.
-   A successful continuation roll must schedule the next phase from the newly
    discovered waypoint toward the original target.
-   Route scan phases must use a fixed 5 minute cycle for now.
-   `deferred_until` must mean the next scan update checkpoint, not the known
    completion time for the whole scan.
-   Each next `deferred_until` must be calculated from the original scan start
    time plus `cycle_length * phase_number`, not from processor runtime.
-   Overdue scans must benefit from shared action drain behavior by resolving
    due checkpoints one phase at a time until the scan is final or the next
    checkpoint is in the future.
-   A failed continuation roll must finish the action as partial while
    preserving all discoveries made by earlier phases.
-   A phase that reaches a direct edge to the target must finish the action as
    fulfilled.
-   A scan that fails before discovering the first hop must finish failed or
    fulfilled-with-failure according to the existing scan result convention,
    without recording false discoveries.
-   Continuation probability must decrease by hop depth using the existing
    diminishing return model.
-   Non-final scan phases must rely on the shared action resolver lifecycle to
    release processing, broadcast intermediate progress, and keep the ship busy.
-   Tests must cover first-hop failure, one-waypoint partial success,
    multi-phase continuation, final route completion, phase result shape,
    immediate discovery persistence, and claiming the scan again after the next
    `deferred_until`.
