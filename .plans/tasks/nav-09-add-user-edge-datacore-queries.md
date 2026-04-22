status: done
---

# Add user edge datacore queries

## Problem

The server now tracks per-player edge discoveries through `helm_user_edge`
and exposes them on `/helm/v1/edges`, but the client datacore still only
knows about nodes and stars. There is no first-class local representation
for a player's discovered edges, and there are no datacore APIs to answer
node-oriented questions such as "what known edges touch node X?" or "what
other nodes are connected to this node?".

That gap keeps route-aware client features tied to transient action payloads
or ad hoc logic. The bridge still renders discovered routes from the latest
scan action instead of persisted data, and follow-up navigation work cannot
rely on a stable local graph until the datacore can store and query the same
per-player edge records the server returns.

## Proposed solution

Add `UserEdge` as a first-class datacore entity alongside nodes and stars.
The datacore should persist the edge shape returned by `/helm/v1/edges`,
including the edge id, both endpoint node ids, distance, and discovery
timestamp, and expose insert and clear operations consistent with the existing
repository pattern.

Expose query APIs that let client code work from a node id without reaching
back into action payloads. At minimum, callers should be able to fetch the
known user edges touching a node and derive the connected node ids for that
node from datacore alone. In practice the route-known check also needs a
direct boolean probe, so the datacore query surface includes:

- `getUserEdgesAtNode(nodeId)`
- `hasUserEdgesAtNode(nodeId)`
- `getConnectedNodeIds(nodeId)`

These operations are idempotent, work with the existing hydrate and reconcile
flows from nav-06, and preserve the server as the source of truth. This task
adds the datacore type and query surface only. It does not change the server
REST shape or introduce new independent write paths outside the existing sync
and reconcile flows.

## Implemented

The shipped datacore work added a dedicated `user_edges` SQLite table keyed by
`(user_id, id)` with endpoint-node indexes so node-oriented lookups stay local
and cheap. The public datacore API now exposes:

- Insert helpers for one edge or many edges.
- `clearUserEdges()` for hydrate clear-and-replace flows.
- `getUserEdgesAtNode(nodeId)` for callers that need the full local edge rows.
- `hasUserEdgesAtNode(nodeId)` for route-known checks without materializing the
  matching edges.
- `getConnectedNodeIds(nodeId)` for deriving adjacent known nodes from the
  local graph.

The implementation remains scoped to datacore storage and query behavior. It
does not add a new server write path, and it keeps hydrate/reconcile as the
callers responsible for deciding when local edge state should change.
