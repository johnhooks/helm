---
status: ready
area: dev
priority: p1
---

# Store private runtime state on actions

## Problem

Long-running actions need private temporal state that is not part of the player-facing command params or public result. Route scans are the immediate case. They need to remember scan cycle timing, cycle index, accumulated private misses, and any internal bookkeeping needed to resume the next checkpoint.

The current route scan redesign stores this state under `ship_state.systems_state.navigation.route_scan`. That puts action-local progress into global ship state. This makes cleanup fragile because action failure, cancellation, deletion, or completion must also remember to clear a separate ship-state blob. It also makes the lifecycle unclear when multiple actions are eventually allowed to run at the same time.

The key boundary should be simple. Global facts about the ship belong on ship state. Private progress for one running action belongs on that action.

## Proposed solution

Add a private runtime state field to ship actions and use it for long-running action internals. Keep action params as the stable command intent and action result as the public outcome. The runtime state field must not be exposed through REST resources, broadcasts, or other player-facing serializers unless a future endpoint explicitly needs internal debugging data.

Runtime state should record anchors and history needed to resume, not precomputed future outcomes. Keeping the state private hides the scan's progress from the player, but resolvers should still calculate each checkpoint against live ship state so mid-action changes to the ship affect what happens next.

For route scans, the scan action should own its private cycle state. The action params should capture the scan intent, including the source node captured at creation time and the target node. The private state should hold cycle timing, cycle count, private miss records or summaries, and any internal data needed to resume. The public result should only be written when a route or waypoint is discovered or when the scan reaches a terminal no-result state.

Do not use `ship_state.systems_state` for route scan progress. Reserve ship state for facts that remain true independently of one action, such as position, power, shields, hull, current concurrency locks, and persistent subsystem conditions.

This should preserve the current single-action concurrency rule for now. If Helm later supports multiple simultaneous actions, each action should still own its own private runtime state. Concurrency should be controlled separately by ship-level locks, system lanes, or validator rules rather than by moving action-local state into global ship state.

## Requirements

-   Add a private action runtime state storage field or equivalent model property.
-   Keep runtime state out of public REST and broadcast action resources by default.
-   Move route scan cycle bookkeeping out of ship state and into the scan action runtime state.
-   Keep route scan params limited to stable intent and keep route scan result limited to public outcome data.
-   Ensure action finalization, failure, cancellation, and deletion cannot leave orphaned route scan progress elsewhere on the ship.
-   Preserve the existing `current_action_id` concurrency behavior in this task.
-   Add tests that prove private route scan state persists across due checkpoints and is not exposed publicly.
