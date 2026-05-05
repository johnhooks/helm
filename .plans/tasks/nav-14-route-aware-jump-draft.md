---
status: ready
area: navigation
priority: p2
depends_on:
    - nav-12-add-node-adjacency-path-selectors
---

# Add route-aware jump drafts

## Problem

The client can now distinguish a direct known edge from an indirect known path,
but the jump UI still treats "route known" as a simple yes or no. That is too
small for the navigation model. A selected star may be reachable through
multiple discovered edges, and the player needs to understand that known route
before committing to movement.

Route planning should not become a separate player-facing concept from
jumping. In Helm, planning a route is the pre-jump phase while the jump action
is still a draft. Splitting that into a separate action such as "Plot Course"
would add ceremony without matching the action model. The player intent is
still "jump there." The draft needs to show whether that jump is one direct leg
or a longer known route.

## Proposed solution

Make the `jump` draft route-aware. The astrometric action should be able to
open a jump draft for a selected star or waypoint when the target is reachable
through the known edge graph. Direct targets remain a simple one-edge jump.
Indirect targets enter the same jump draft flow, but the draft card presents
the known path as a route plan before submission.

The draft should use `findKnownPath` as its source of truth. It should show the
ordered route, total known distance, hop count, and next node when the selected
target is reachable indirectly. It should not describe an indirect route as a
single immediate jump.

Submitting a route-aware jump should create one jump action that follows the
known route leg by leg. The action should store the ordered route, per-leg
distances, total distance, total planned cost, current leg index, and final
target. Each leg should update the ship location when that leg completes, then
schedule the next leg by calculating that leg's duration and updating
`deferred_until`. The action remains the ship's current action until the final
leg is complete or the route fails.

The current action queue is close to this model but does not support it
directly. `claimReady()` can pick up a pending action again after
`deferred_until`, but `ActionResolver` currently fulfills every action after a
single resolver pass and clears `current_action_id`. This task must extend the
action lifecycle so a resolver can make progress, broadcast the intermediate
state, return the action to `pending` for the next leg, and avoid clearing the
ship's current action until the route is fully complete.

Scan eligibility remains separate. A target can be reachable through an
indirect known path and still be scannable if there is no direct edge from the
current node to that target.

## Requirements

-   The context menu should treat `Jump` as the route-planning entry point for
    both direct and indirectly reachable targets.
-   Direct jumps should continue to use direct adjacency through one known user
    edge.
-   Indirect known paths should draft a jump route plan rather than introducing a
    separate `Plot Course` action.
-   The draft UI must display total known route distance, hop count, and next
    node for indirect paths.
-   The draft UI must distinguish a direct one-edge jump from an indirect known
    route.
-   Submitting an indirect route should create one jump action that follows the
    full known route, not a sequence of separately drafted player actions.
-   The jump action must store enough route state to resume each intermediate
    leg from the action record.
-   Each completed leg must update the ship's current node, action result,
    `deferred_until`, and broadcast state so clients can show progress.
-   The action must remain non-terminal, and the ship must remain busy, until
    the final leg completes or the route fails.
-   The action resolver lifecycle must support a resolver returning an action to
    `pending` instead of always fulfilling it after one resolver pass.
-   If the known route becomes invalid during the journey, the action should
    fail or become partial with a clear error rather than silently skipping legs.
-   Total displayed distance and cost must add up the route legs, not just the
    final target distance from the current node.
-   Scan Route visibility must continue to use direct adjacency, not known-path
    reachability.
-   Tests must cover direct jump drafts, indirect route-plan drafts, unreachable
    targets, multi-leg action progression, intermediate location updates,
    final fulfillment, route failure, and the interaction between indirect
    reachability and scan eligibility.
