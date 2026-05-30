---
status: draft
area: navigation
priority: p2
depends_on:
    - nav-14-route-aware-jump-draft
---

# Wire route-aware jump UI

## Problem

The server can now accept a route-aware jump action, but the player-facing
navigation UI still needs to use that contract. A selected destination may be
reachable through a known multi-hop path, yet the draft flow still needs to
present that route clearly before the player commits.

Without this UI work, route-aware jumping is only available to callers that
already know how to build `from_node_id`, `target_node_id`, and `route`.
Players need the astrometric interface to recognize when an already-known path
exists, understand whether the jump is direct or routed through discovered
waypoints, and submit the canonical route edge IDs expected by the backend.

Jump is not allowed to plan through unknown space. Unknown-space discovery
belongs to Scan Route and its multiphase scan work. This UI should only plot
routes made from edges the player already knows.

## Proposed solution

Update the navigation UI so `Jump` is the route-planning entry point for both
direct known edges and indirectly reachable known paths. The draft should use
the known-path data available to the client as the source of truth for the
plotted known route, then submit one jump action with `params.from_node_id`,
`params.target_node_id`, and `params.route`.

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
without introducing a separate Plot Course action. For indirect routes it
should show the ordered path, total known route distance, hop count, next node,
and an initial planned duration based on the route legs. It should not present
an indirect path as a single immediate jump or use straight-line distance to the
final destination for route totals.

If no known path exists, Jump should remain unavailable. The player should use
Scan Route to attempt discovery through unknown space.

Scan Route visibility remains based on direct adjacency. A target that is
reachable by an indirect known path can still offer Scan Route when no direct
edge from the current node to that target is known.

## Requirements

-   The selected-target action menu offers `Jump` for direct known edges and
    indirect known paths.
-   The selected-target action menu does not offer Jump for unknown routes.
-   Direct jumps submit a one-edge `params.route`.
-   Indirect jumps submit one action with an ordered list of discovered user
    edge IDs in `params.route`.
-   Jump drafts include `from_node_id`, `target_node_id`, and `route`.
-   The draft does not submit client-supplied leg node pairs or distances.
-   Indirect jump drafts show total known route distance, hop count, next node,
    and the ordered waypoint path.
-   Route totals use the sum of known route legs, not straight-line distance to
    the final target.
-   Jump UI never implies that Jump can discover, infer, or shortcut unknown
    route legs.
-   Scan Route visibility continues to use direct adjacency rather than
    known-path reachability.
-   Tests cover direct jump drafts, indirect route drafts, unreachable targets,
    route-aware submission payloads, and scan eligibility for indirectly
    reachable targets.
