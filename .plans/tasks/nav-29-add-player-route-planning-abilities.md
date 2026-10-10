---
status: draft
area: navigation
priority: p2
---

# Add player route planning abilities

## Problem

Nearby scan targets help players choose where to investigate, but proximity and
route discovery flags do not establish a path from the ship. A discovered edge
touching a target may belong to a disconnected part of the player's known graph.
The direct-route flag also cannot describe an existing journey through
intermediate nodes.

Players need to inspect selected destinations individually, find a known route,
and compare its distance with a potential direct connection. This would help
identify useful scan targets and provide an ordered route for a later jump
without manually assembling the discovered graph.

## Proposed solution

Add read-only route planning under `Abilities/Player`, starting with a
`helm/plan-route` ability accepting `ship_id` and `target_node_id`. Derive the
origin from the owned ship's current position. Find the shortest known path by
total edge distance using only the authenticated player's discovered edges.
Treat edges as traversable in either direction and allow intermediate waypoints.

Return the origin and target IDs, whether a known path exists, ordered edge IDs,
directed legs, and total distance in light-years. Make the edge list usable as
the `route` input to the existing jump ability. Use deterministic selection when
multiple paths have equal distance. Distinguish an unreachable target from a
target that is already the ship's current node. Unknown or invalid nodes,
unowned ships, and ships without a usable position should return descriptive
errors through the existing error enum.

Include the straight-line distance from the current node to the target and the
potential distance saving compared with the shortest known path. Define saving
as known-path distance minus direct distance, with an optional percentage
relative to known-path distance. Use null comparisons when no known path exists
and handle a zero-distance journey without division by zero. Label this as a
hypothetical shortcut, not a promise that scanning will discover a direct edge
or that the resulting route will have that distance.

Keep connectivity and distance planning distinct from jump feasibility. A known
path does not guarantee sufficient core life, acceptable leg ranges, the fastest
journey, or an idle ship. Action submission remains authoritative. Duration and
resource estimates should share the eventual jump-preview contract rather than
introducing separate formulas here.

Keep nearby-target discovery lightweight. The existing
`has_any_discovered_route` flag only asks whether a player's discovered edge
touches a page target. It is separate from planning and is not a prerequisite for calling
the planner. Do not traverse the graph for every target in a nearby listing.

Put graph planning in a reusable navigation service backed by player-scoped
repository access. Keep ability schemas, permissions, and execution together in
the ability class, with explicit class imports. Existing
`RouteRepository::shortestBetween()` selects a globally saved route and does not
provide the required player-scoped graph search. Do not treat it as a substitute
for traversing discovered edges.

Expose the ability through the existing Abilities REST surface and MCP tool
registration. Planning must not create actions, discover edges, save routes,
change ship state, consume resources, or advance time. Bound expensive searches
and report incomplete planning explicitly rather than declaring a destination
unreachable when a search limit is reached.

## Verification

Use a dedicated test class for each added ability. Compose scenarios in tests
from focused existing helpers rather than a fixed shared ability scenario.
Cover direct and multi-leg routes, reversed edges, cycles, disconnected graphs,
other players' discoveries, equal-distance alternatives, same-node requests,
missing positions, invalid inputs, and ownership failures. Verify distance
comparisons, ordered jump-compatible edge IDs, bounded-search outcomes, and the
absence of state changes. Exercise the exposed contract through REST and MCP.

## Related work

- [Add jump route preview](nav-25-add-jump-route-preview.md) covers validating an
  explicit route and estimating duration and core cost. Coordinate shared route
  representations without making route discovery depend on that preview work.
