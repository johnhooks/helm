---
status: active
area: navigation
priority: p2
depends_on:
    - actions-01-add-multiphase-action-lifecycle
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

The generic multiphase action lifecycle is tracked separately in
`actions-01-add-multiphase-action-lifecycle`. This task now builds on that
shape by letting `jump` opt into a route-aware continuation flow.

## Proposed solution

Make the `jump` draft route-aware. The astrometric action should be able to
open a jump draft for a selected star or waypoint when the target is reachable
through the known edge graph. Direct targets are the one-leg case of the same
route model. Indirect targets enter the same jump draft flow, but the draft
card presents the known path as a route plan before submission.

The draft should use `findKnownPath` as its source of truth. It should show the
ordered route, total known distance, hop count, and next node when the selected
target is reachable indirectly. It should not describe an indirect route as a
single immediate jump.

Waypoint routes are not straight-line shortcuts. A waypoint exists because the
direct path was not safely navigable, so a route through waypoints may be
longer than the current node to final target distance. The draft and submitted
action should treat the route as the sum of its known legs for display, cost,
and timing. The initial time estimate is a plan estimate. As each leg resolves,
the remaining estimate should shift based on the completed progress, the next
leg distance, and any updated route state.

Submitting a route-aware jump should create one jump action that follows the
known route leg by leg. The plotted route is action input and is stored as an
ordered list of discovered user edge IDs in `params.route`. The action params
must include `from_node_id`, `target_node_id`, and `route`. Client-supplied
node-pair legs and distances are not accepted as route input. The server loads
the canonical user edges in one repository call. If any submitted edge ID is not
returned, the user does not have permission to travel that edge and the action
must fail validation. Validation then walks the returned edges in the submitted
order: start at `from_node_id`, require `from_node_id` to match the ship's
current node, require each edge to connect to the current node, advance to the
other endpoint, and require the final node to equal `target_node_id`.

The handler uses the first edge only to schedule the initial wait, but does not
prebuild action output. Per-leg outcomes are action output and are appended to
`result.phases` as each leg completes. Phase entries should not repeat route
input fields from `params.route`; callers align route edges and phases by array
index. The jump resolver is responsible for costing only the current edge,
updating the ship's location when that edge completes, setting the next edge's
`deferred_until`, and marking the action final only when the route is complete.
The action should not calculate or reserve the whole route up front. If a later
edge can no longer continue, the resolver should raise the existing action
failure path rather than silently skipping it. The shared action resolver
lifecycle handles the non-final bookkeeping between legs.

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
-   Submitting an indirect route should create one jump action that follows the
    full known route, not a sequence of separately drafted player actions.
-   The jump action must store the plotted route as `params.route`, an ordered
    list of discovered user edge IDs.
-   Route-aware jump params must include `from_node_id`, `target_node_id`, and
    `route`.
-   Route input must not include client-supplied node pairs or distances; the
    server must look up canonical edge endpoints and distance for validation,
    scheduling, cost, and result output.
-   The jump validator must validate the entire planned route before the action
    starts. It must fetch all submitted user edges for the ship owner in one
    repository call, preserve submitted route order for path walking, reject
    missing edge IDs, and walk the edge endpoints to prove the ordered edges
    form one continuous route from the ship's current node to `target_node_id`.
-   The jump validator must require `params.from_node_id` to equal the ship's
    current node. Route walking starts at `params.from_node_id`, advances across
    each submitted edge by endpoint connectivity, and must end exactly at
    `params.target_node_id`.
-   The jump handler must keep action input in `params` and avoid building any
    `result` data before the resolver completes work.
-   Route phase progress and per-leg outcomes must follow the `result.phases`
    convention established by the multiphase action lifecycle.
-   Route phase entries must avoid duplicating `params.route` leg fields; a
    phase describes the outcome for the route leg at the same array index.
-   Each completed leg must update the ship's current node and action result,
    then set the next leg's `deferred_until` from that leg's distance before
    leaving the action non-final.
-   Route jump cost, duration, and failure checks must happen per leg as that
    leg is processed, not as an up-front calculation for the whole route.
-   Non-final route phases should rely on the shared action resolver lifecycle
    to keep the ship busy, release the processing lock, and broadcast
    intermediate progress.
-   The jump resolver must mark the action terminal only after the final leg
    completes, the route fails, or the route can only be partially completed.
-   If the known route becomes invalid during the journey, the action should
    fail or become partial with a clear error rather than silently skipping legs.
-   Total displayed distance and cost must add up the route legs, not just the
    final target distance from the current node.
-   The UI must distinguish the initial planned duration from remaining time
    that changes as jump phases complete.
-   Route UI must render the plotted waypoint path and its cumulative distance,
    not a direct line or direct distance to the final target.
-   Scan Route visibility must continue to use direct adjacency, not known-path
    reachability.
-   Tests must cover direct jump drafts, indirect route-plan drafts, unreachable
    targets, multi-leg action progression, intermediate location updates,
    final fulfillment, route failure, and the interaction between indirect
    reachability and scan eligibility.
