---
status: draft
---

# Add node adjacency path selectors

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
multiple stars, and may have discovered shapes that do not terminate cleanly
at a system node yet. The store needs a first-class way to surface that known
graph from any node so route planning and star-context UI can build on
persisted discoveries instead of one-off scan payloads.

## Proposed solution

Extend the nav store with selector-level graph reads that start from a node id
and return the discovered navigation state that is locally available from that
origin. At minimum, callers should be able to ask for the directly available
edges and connected nodes at a node, and to ask for the known paths that can
be followed outward through discovered edges until they terminate at a star or
at the furthest known waypoint in that branch.

The selector contract should treat waypoints and systems as first-class graph
nodes. A branch should continue through waypoints recursively while protecting
against cycles and duplicated work, and it should stop when there is no
further discovered edge to follow or when it reaches a system node that
represents a star destination. The result should preserve enough structure for
the caller to distinguish direct adjacency from the recursively followed path,
rather than flattening everything into an unordered node list.

This work should build on the existing datacore edge queries instead of adding
new server endpoints. Multiple local queries are acceptable if needed, but the
selector surface should hide that complexity from callers and avoid pushing
N-plus-1 traversal logic into components. If the current store shape makes
that awkward, extend the nav package with a small graph-read abstraction that
keeps traversal and caching behavior in one place.

The outcome is a reusable nav-store contract for node-oriented graph reads:

- direct adjacency from a node id
- reachable waypoint branches from that node
- terminating stars when a known branch reaches a system node
- partial branch termination when the known graph ends at a waypoint

This task is about selector and local graph-read behavior only. It does not
change scan generation, edge discovery rules, or waypoint visibility on the
backend.
