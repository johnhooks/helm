---
status: done
area: navigation
priority: p1
---

# Track edge discoveries per player

## Problem

The edge graph is stored globally on the server in `helm_nav_edges` with a
unique constraint on each node pair. The only ownership marker is
`discovered_by_ship_id`, which records who first found the edge and nothing
more. There is no server-side record of which edges a given player knows
about.

Today the only per-player edge knowledge lives in two ephemeral places.
Fulfilled scan action payloads carry the nodes and edges the scan found,
and the client datacore accumulates them as they arrive. Both are fragile.
Action payloads age out of the client actions store under pagination, and
the browser datacore evaporates when storage is cleared, the player
switches devices, or a fresh login hits a new machine.

The navigation design (`docs/navigation.md` > Fog of War > Player
Knowledge) is explicit that discoveries belong to the player and must
survive ship loss and device changes. Without a per-player server record
this guarantee cannot be met, and every feature that asks "what does this
player know?" is forced to race the actions store or trust a cache that
can vanish.

Nav-06 assumes a stable per-player edge source when it reconciles scans
into the datacore. Nav-07 assumes it when drawing the player's known graph
on the starfield. Both remain shaky until this lands.

## Proposed solution

Add a `helm_user_edge` table that joins WordPress users to edges, plus a
REST path that returns the authenticated user's known edges. Wire the scan
resolver to upsert a row for the scanning player whenever a new edge
shows up in a scan result, so discovery is captured at the moment it
happens and never depends on the action payload surviving.

-   **New table** `helm_user_edge` keyed by `(user_id, edge_id)`, with a
    `discovered_at` timestamp. Uniqueness is on the pair so repeated scans
    of the same edge do not produce duplicate rows.
-   **Scan resolver** upserts into the table for each edge in its result,
    using the WordPress user id that owns the scanning ship. This is the
    only write path introduced by this task. Nothing else should insert
    into the table.
-   **REST endpoint** returning the authenticated user's known edges along
    with the referenced `node_a_id` and `node_b_id` values so the client
    can fetch any unknown node coordinates in a follow-up call. Shape is
    flat enough that a follow-up backfill or a fresh-device hydrate can
    consume it without special cases.
-   **Freshness headers on every response.** Both `GET` and `HEAD` on the
    list endpoint carry `X-Helm-Edge-Count` (total known edges for this
    user) and `X-Helm-Edge-Last-Discovered` (ISO 8601 timestamp of the
    most recent `helm_user_edge` row for this user, or empty when the
    user has none). This follows the WP REST convention where collection
    endpoints expose `X-WP-Total` and `X-WP-TotalPages`. Clients probe
    freshness with a single HEAD, and every GET already carries the same
    pair so a fetched response is self-describing. No dedicated probe
    route.
-   **Waypoint nodes stay global.** Scans reveal them as coordinates on
    demand, and the existing node endpoints serve them by id. A player
    only ever learns of a waypoint through a scan that references it, so
    the global node table does not leak information on its own.
-   **Update `docs/navigation.md`** so the Fog of War section matches this
    model. Drop references to `helm_user_node`. Keep `helm_user_edge`.
    Rewrite the player-knowledge bullets to make clear that only edge
    knowledge is tracked server-side, waypoint coordinates are fetched
    lazily by id from the global node table, and device switching
    preserves edge discoveries.

Constraints:

-   Per-user, not per-ship. Losing a ship, switching ships, or running a
    second ship does not change the player's chart.
-   Server is the source of truth. The client datacore is a cache that must
    be rebuildable from the new endpoint alone.
-   No changes to the shape of scan action results. Live scan UI continues
    to consume the embedded nodes and edges as it does today.
-   The "edge becomes public after enough traversals" rule from
    `docs/navigation.md:84` is out of scope for this task. The endpoint
    returns the authenticated user's private discoveries only.
-   Team or faction sharing is out of scope.
-   Historical backfill for edges discovered before this task shipped is
    not in scope. Once the table exists, discovery accrues forward from
    the next scan.

## Follow-ups unblocked

-   Nav-06 can reconcile scan results into the datacore against a stable
    source, and drop the "forward-only from session open" caveat by
    hydrating from the new endpoint on first load.
-   Nav-07 (show routes toggle) and the context menu's route-known check
    can query a real per-player source instead of `hasFulfilledScanRouteTo`
    reading the actions store.
