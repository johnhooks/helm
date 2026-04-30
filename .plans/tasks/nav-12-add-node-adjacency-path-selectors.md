---
status: done
area: navigation
priority: p2
depends_on:
  - nav-09-add-user-edge-datacore-queries
---

# Add known path selectors

## Problem

The navigation datacore can now answer low-level edge questions such as which
user edges touch a node and which node ids are directly connected, but the
client nav store still exposes only simple node selectors. There is no
selector surface for asking higher-level graph questions from a node id.

That leaves upcoming navigation features without a stable way to inspect the
known corridor from the current node. UI code that wants to show available
edges, reachable waypoints, or the stars those corridors eventually lead to
would have to reimplement graph traversal ad hoc, stitch together node and
edge lookups on its own, and guess where to stop when a branch ends at a
waypoint instead of a star.

This matters because the navigation design depends on partial knowledge. A
player may know only part of a corridor, may branch from a waypoint toward
multiple stars, and may have discovered shapes that pass through intermediate
systems before reaching a selected destination. The store needs a first-class
way to surface useful facts about the known graph from any node so route
planning and star-context UI can build on persisted discoveries instead of
one-off scan payloads.

There are also two different questions hiding behind today's "route known"
language:

- Is the target directly adjacent to the current node through one known edge?
- Is the target reachable through any known edge path?

Those answers drive different UI and action behavior. A scan route action is
eligible when there is not already a direct edge between the current node and
the selected target. A selected target may still be reachable through an
indirect known path, but that does not make another scan useless because a
direct corridor may still be valuable. Jump and route-planning UI need the
reachable-path answer, but direct one-edge jumping remains a separate concept
unless a later task adds an explicit multi-hop route-following action.

## Proposed solution

Extend the nav package with graph reads that start from a node id and inspect
the locally cached discovered edge graph. The first implementation should be
target-specific and bounded by what current UI needs. It should answer direct
adjacency and find a known path from an origin node to a selected target node.
It should not eagerly compute the whole reachable frontier unless a caller
explicitly asks for that broader shape in a later task.

The graph contract should treat waypoints and systems as first-class nodes. A
known-path search must not stop at intermediate system nodes. Systems can be
waypoints in a larger route, so traversal should continue until the requested
target is found or the known graph is exhausted. The path result should
preserve ordered structure, including node ids, edge ids, total distance, and
the next node to jump to when the target is reachable indirectly.

Use shortest known path by edge distance for the first route plan. Dijkstra is
the expected algorithm because edge weights are already available as
`distance`, and later tasks can swap or extend the weighting model for travel
time, core cost, hazard, public/private preference, or route safety.

This work should build on the existing datacore edge data instead of adding new
server endpoints. The implementation can add one or more datacore graph-read
methods if that keeps traversal in the worker and prevents React components
from making chains of async neighbor calls. Components should consume a small
nav-level contract rather than reimplementing traversal or directly walking
datacore edge queries.

This task is about local known-chart pathfinding only. It does not change scan
generation, edge discovery rules, waypoint visibility on the backend, jump
action validation, or saved public/private route records.

## Requirements

- Provide reusable nav/datacore reads for direct adjacency and target-specific
  known-path lookup.
- Direct adjacency means one discovered user edge connects the two requested
  nodes in either direction.
- Known-path lookup searches discovered user edges from origin to target,
  including through waypoint and system nodes.
- Traversal must not stop at intermediate systems, must handle cycles, and must
  return the shortest path by total edge distance.
- Path results must include reachability, directness, ordered node ids, ordered
  edge ids, total distance, and the next node id when reachable.
- No-path and origin-equals-target results must be distinguishable.
- UI callers must not perform their own N-plus-1 graph traversal.
- Do not add REST endpoints or change scan, action result, or jump server
  behavior.
- Tests must cover direct edge, indirect path, no path, cycle handling,
  bidirectional edges, origin equals target, and shortest-path selection.
