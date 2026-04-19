# Persist scan discoveries in the datacore

## Description

The datacore today tracks nodes and stars but has no concept of edges, and
new waypoint nodes created by a scan only appear locally after the next full
`syncNodes` clear-and-replace. Everything a scan produces — the discovered
route edges, any waypoint nodes the server created to carve the route — lives
only inside `action.result` on the latest scan action in the actions store.
That is ephemeral, paginated, per-session state, and it is already the wrong
source of truth for features that need to ask "do we have a route to this
star?"

Two downstream UX behaviors are currently faking answers off that fragile
store. The star context menu hides Scan Route once a route is known and only
surfaces Jump once a route is known — both of those questions belong to the
navigation graph, not to a transient action record. The future jump and scan
visual indicators on the starfield (nav-03, nav-04) have the same need. Every
one of these reads wants a local, authoritative, cross-session view of the
route graph, and today there is nothing like that on the client.

This task makes the datacore that authoritative view for everything a
scan has surfaced since the feature shipped. Completed scans arriving via
heartbeat reconcile into datacore: their edges are persisted, and any
waypoint nodes the result references but the datacore does not already have
are fetched from the server and inserted. After this lands, the route-known
check is a datacore query, the set of jumpable stars is a datacore query, and
the indicators in nav-03 / nav-04 can be built against stable data rather
than racing the actions store.

Backfill of past scans that predate the feature is out of scope here. The
reconcile contract should be shaped so a later task can walk historical
results — from state on reload or from the ship action list on init — and
feed them through the same path, but this task ships forward-only.

## Plan

The datacore grows a third first-class entity alongside nodes and stars:
edges, with whatever fields the scan result already carries (edge id, two
node ids, and whatever metadata the rest of the system reasonably needs).
The insert path is a normal datacore operation — it is the *caller* that
becomes interesting.

Reconciliation is triggered by the heartbeat path: whenever a scan action
transitions into a fulfilled or partial state and its result becomes
available, the client runs a single reconcile step against the datacore.
The step collects the nodes and edges referenced by the result, diffs them
against what the datacore already knows, fetches any missing nodes from the
server in one batched request, and inserts everything inside a datacore
transaction. A single scan with several unknown waypoints must not produce
several round trips.

The reconcile operation should be idempotent and expressed as a single
entry point — something a future backfill task can call N times with
different scan results without needing to re-derive the logic. Where that
entry point lives (nav package, actions package, or a small new module) is
an implementation call; the contract is "given a scan result, make the
datacore reflect it."

Backfill is deliberately not wired up. Leave a clear seam — the reconcile
function should accept the result in the same shape the actions store holds
it in — so the future backfill task is pure orchestration.

## Requirements

- Scan action results received via heartbeat, once their status is
  fulfilled or partial, cause their edges to be inserted into the
  datacore.
- Any node ids referenced by a reconciled scan result but absent from the
  datacore are fetched from the server and inserted before the edges that
  reference them.
- Multiple missing node ids from a single reconcile must be fetched in a
  single request, not one request per missing id.
- Reconciling the same scan result twice leaves the datacore in the same
  state it was in after the first reconcile.
- The datacore exposes enough of the edge graph for callers to answer
  "is there a known route touching node X?" and "what nodes are connected
  to the current node by known edges?" without reading the actions store.
- Reconcile is the only write path introduced by this task. Other features
  must not start writing edges independently.
- No visual UI changes ship in this task; the context menu and starfield
  indicators consume the new data in their own follow-up tasks.
- No action contract changes, and no server-side schema changes beyond an
  optional batched fetch-nodes-by-id endpoint if one does not already
  exist.
- Historical scan results already in the actions store on app init are
  not reconciled by this task. A follow-up task will do that by reusing
  the same reconcile entry point.
