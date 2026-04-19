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

This task makes the datacore that authoritative local view. Two paths
feed it. On bridge hydrate the client syncs against the per-player edge
endpoint from nav-08 so a cold load, a cleared browser, or a fresh device
arrives at the same graph the server knows about. While the bridge is
open, fulfilled scan actions arriving via heartbeat reconcile into the
datacore so in-session discoveries land immediately without waiting for
the next sync. Together those two paths mean the datacore is a true
cache of the server's per-player state, not a parallel log that accrues
on its own.

Nav-08 is a prerequisite. Without it there is no server-side source of
truth to hydrate from.

After this lands, the route-known check is a datacore query, the set of
jumpable stars is a datacore query, and the indicators in nav-03 / nav-04
can be built against stable data rather than racing the actions store.

## Plan

The datacore grows a third first-class entity alongside nodes and stars:
edges, with whatever fields the scan result already carries (edge id, two
node ids, and whatever metadata the rest of the system reasonably needs).
The insert path is a normal datacore operation — it is the *caller* that
becomes interesting.

### Bridge hydrate sync

On bridge hydrate the client compares its cached view against the server
using the headers nav-08 puts on every `/me/edges` response. The datacore
keeps `X-Helm-Edge-Count` and `X-Helm-Edge-Last-Discovered` in its meta
table from the previous sync. A single `HEAD` on the edge endpoint returns
the current pair. If both values match what the datacore has, hydrate is
a no-op. If either differs, the client issues a `GET`, replaces the edge
table inside a single datacore transaction, fetches any unknown referenced
node ids from the server, and stores the new pair in meta.

### In-session reconcile

Reconciliation is also triggered by the heartbeat path: whenever a scan
action transitions into a fulfilled or partial state and its result becomes
available, the client runs a single reconcile step against the datacore.
The step collects the nodes and edges referenced by the result, diffs them
against what the datacore already knows, fetches any missing nodes from the
server in one batched request, and inserts everything inside a datacore
transaction. A single scan with several unknown waypoints must not produce
several round trips.

Both paths share the same insert helpers and the same idempotency
guarantee. Running the hydrate twice in a row, or reconciling the same
scan result twice, must leave the datacore in the same state as running
either once.

The reconcile operation should be expressed as a single entry point —
something a future backfill task can call N times with different scan
results without needing to re-derive the logic. Where that entry point
lives (nav package, actions package, or a small new module) is an
implementation call; the contract is "given a scan result, make the
datacore reflect it."

Backfill is deliberately not wired up. Leave a clear seam — the reconcile
function should accept the result in the same shape the actions store holds
it in — so the future backfill task is pure orchestration.

## Requirements

- On bridge hydrate the client sends a `HEAD` to the nav-08 edge
  endpoint, compares `X-Helm-Edge-Count` and `X-Helm-Edge-Last-Discovered`
  against the datacore meta from the previous sync, and skips the fetch
  when both match.
- When either header differs, the client issues a `GET`, replaces the
  datacore edge table inside a single transaction, fetches any referenced
  node ids absent from the datacore in one batched request, and writes
  the new header pair into datacore meta.
- Scan action results received via heartbeat, once their status is
  fulfilled or partial, cause their edges to be inserted into the
  datacore.
- Any node ids referenced by a reconciled scan result but absent from the
  datacore are fetched from the server and inserted before the edges that
  reference them.
- Multiple missing node ids from a single reconcile or hydrate must be
  fetched in a single request, not one request per missing id.
- Hydrating twice in a row, or reconciling the same scan result twice,
  leaves the datacore in the state it was in after the first pass.
- The datacore exposes enough of the edge graph for callers to answer
  "is there a known route touching node X?" and "what nodes are connected
  to the current node by known edges?" without reading the actions store.
- Hydrate and reconcile are the only write paths introduced by this task.
  Other features must not start writing edges independently.
- No visual UI changes ship in this task; the context menu and starfield
  indicators consume the new data in their own follow-up tasks.
- No action contract changes. Depends on nav-08 for the server endpoint
  and its headers. Any missing batched fetch-nodes-by-id endpoint may be
  added alongside this task if one does not already exist.
- Historical scan results already in the actions store on app init are
  not reconciled by this task. A follow-up task will do that by reusing
  the same reconcile entry point.
