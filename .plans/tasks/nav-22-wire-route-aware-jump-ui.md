---
status: done
area: navigation
priority: p2
---

# Wire route-aware jump draft UI

## Problem

The server can now accept a route-aware jump action, but the player-facing
navigation UI still needs to use that contract. A selected destination may be
shown on the map or present in local data without being reachable from the
ship's current node. The draft flow needs to prove reachability through known
connected user edges before it offers or submits Jump.

Without this UI work, route-aware jumping is only available to callers that
already know how to build `from_node_id`, `target_node_id`, and `route`.
Players need the astrometric interface to recognize when an already-known
connected path exists, understand whether the jump is direct or routed through
discovered waypoints, and submit the canonical route edge IDs expected by the
backend. The same route lookup is also needed to calculate route light years
from known edge distances instead of guessing from selected-node position.

Jump is not allowed to plan through unknown space. Unknown-space discovery
belongs to Scan Route and its multiphase scan work. This UI should only plot
routes made from connected edges the player knows. Today known edges come from
the player's own scans, so known usually implies connected. In the future,
purchased or shared route data may unlock disconnected map islands. The Jump UI
should be written for that future by consulting pathfinding before offering the
action, not by assuming a selected known node is reachable.

## Proposed solution

Update the navigation UI so `Jump` is the route-planning entry point for both
direct known edges and indirectly reachable known paths. The context menu should
consult the existing datacore-backed `findKnownPath` flow before offering Jump.
If no connected path exists from the ship's current node to the selected target,
Jump should not be offered. `findKnownPath` is async, but it reads local datacore
state. The context menu should wait for that local lookup before rendering rather
than render a provisional Jump action.

For now, route choice should be automatic: use the shortest known connected path
returned by `findKnownPath`. The draft should use that result as the source of
truth for route edge IDs, hop count, next node, and total light years, then
submit one jump action with `params.from_node_id`, `params.target_node_id`, and
`params.route`.

Before implementation, read the existing server contracts that this UI should
consume rather than re-creating route or probability behavior in the client:

-   `src/Helm/ShipLink/Actions/Jump/Validator.php` validates
    `from_node_id`, `target_node_id`, and ordered `params.route` edge IDs.
-   `src/Helm/ShipLink/Actions/Jump/Handler.php` schedules the first route leg.
-   `src/Helm/ShipLink/Actions/Jump/Resolver.php` appends completed route legs
    to `result.phases` and schedules later legs.
-   `src/Helm/ShipLink/ActionResolver.php`,
    `src/Helm/ShipLink/ActionType.php`, and the action repositories define the
    shared multiphase lifecycle for phase-ready running actions.
-   `src/Helm/Navigation/NavComputer.php` and
    `src/Helm/ShipLink/System/Sensors.php` own route scan probability and
    discovery depth for Scan Route. Jump UI must not fork that probability
    model or imply that Jump can discover unknown route legs.

The draft view should distinguish a direct one-leg jump from a multi-hop route
without introducing a separate Plot Course action or manual route picker. For
indirect routes it should show the ordered shortest path, total known route
distance, hop count, next node, and an initial planned duration based on the
route legs. It should not present an indirect path as a single immediate jump or
use straight-line distance to the final destination for route totals.

This task owns the pre-submit experience only: target selection, route choice,
draft rendering, and submit payloads. Active progress and terminal result cards
are separate follow-up tasks.

If no connected known path exists, Jump should remain unavailable even if the
target node itself is known or visible in local data. The player should use Scan
Route to attempt discovery through unknown space.

Scan Route visibility remains based on direct adjacency. A target that is
reachable by an indirect known path can still offer Scan Route when no direct
edge from the current node to that target is known.

## Requirements

-   The selected-target action menu waits for the local datacore-backed
    `findKnownPath` lookup from the ship's current node to the selected target
    before rendering menu actions.
-   The selected-target action menu offers `Jump` only when `findKnownPath`
    returns a reachable connected route.
-   The selected-target action menu does not offer Jump for unknown routes,
    disconnected known map islands, or failed path lookups.
-   Direct jumps submit a one-edge `params.route`.
-   Indirect jumps use the shortest route returned by `findKnownPath`.
-   Indirect jumps submit one action with the ordered discovered user edge IDs
    from that shortest route in `params.route`.
-   Jump drafts include `from_node_id`, `target_node_id`, and `route`.
-   The draft does not submit client-supplied leg node pairs or distances.
-   Indirect jump drafts show total known route distance in light years, hop
    count, next node, and the ordered shortest waypoint path.
-   Route light-year totals use the sum of known route legs returned by
    pathfinding, not straight-line distance to the final target.
-   Jump UI never implies that Jump can discover, infer, or shortcut unknown
    route legs.
-   Scan Route visibility continues to use direct adjacency rather than
    known-path reachability.
-   Tests cover direct jump drafts, indirect route drafts, unreachable targets,
    disconnected known targets, route-aware submission payloads, route selection
    state, route light-year totals, and scan eligibility for indirectly
    reachable targets.
