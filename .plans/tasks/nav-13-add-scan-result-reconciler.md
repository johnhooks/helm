---
status: draft
area: navigation
priority: p2
depends_on:
    - nav-06-persist-scan-discoveries
---

# Add a scan result reconciler

## Problem

Scan route discoveries now reconcile into the datacore when scan actions arrive
through heartbeat, but the trigger logic lives in the heartbeat action path.
That means other places that receive ship actions from REST responses have to
remember how to detect scan route results, extract discovered edge ids, and ask
the nav package to import the canonical edge and node data.

That is fragile because scan actions can enter the client through more than one
path. Heartbeat is the live update path, but action detail responses, paged ship
log responses, and a future historical backfill may also contain fulfilled or
partial scan route results. If each caller reimplements the same checks, they
can drift apart and some scan discoveries may remain only in the actions store
instead of landing in the datacore.

## Proposed solution

Add a reusable scan result reconciliation entry point that accepts the same scan
route result shape stored on ship actions and makes the local datacore reflect
the canonical server state for that result.

The entry point should keep the current authority boundaries intact. It should
use `discovered_edge_ids` as the import key, fetch canonical `UserEdge` rows
from `/helm/v1/edges?include=...`, fetch any missing endpoint nodes in one
batched node request, and write nodes before edges. It must not treat
`action.result.edges` as canonical edge data or invent `discovered_at`.

Heartbeat should call this reconciler instead of deriving the edge import path
inline. Ship action REST receive paths should use the same reconciler when they
receive fulfilled or partial scan route actions with discovered ids. A future
backfill should be able to iterate existing scan results and call the same
entry point without knowing the details of edge and node import.

The reconciler should be idempotent. Calling it twice for the same result should
not duplicate records or mutate server-owned discovery timestamps.
