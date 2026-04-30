---
status: draft
area: navigation
priority: p2
depends_on:
  - nav-06-persist-scan-discoveries
  - nav-07-show-routes-toggle
  - nav-13-add-scan-result-reconciler
---

# Clean up scan results

## Problem

Scan route action results still carry transitional navigation graph data in
`edges` and `nodes`. That helped bridge the UI while discovery reconciliation
was being added, but it keeps the cards and map close to the old model where a
completed scan action is treated as a local source of truth.

The canonical graph now lives in the nav datacore and comes from
`/helm/v1/edges`. A completed scan result should identify what was discovered,
then the UI should select whatever canonical data is available from the nav
store. That selection may be incomplete for a short time while edge and node
data reconciles. The UI does not have a good loading state for a specific set
of discovered edges, so the selection API should default to empty values and
the cards should render incomplete data without treating it as an error.

## Proposed solution

Move scan cards off embedded `action.result.edges` and `action.result.nodes`.
Cards should use `discovered_edge_ids` and `discovered_node_ids` as references,
ask the nav store for matching known graph data, and fall back to empty arrays
or placeholder readouts when the graph data has not arrived yet.

The star map route layer is handled separately by
`nav-07-show-routes-toggle`. This task should not own map route rendering, but
it can remove embedded scan result fields once `nav-07` and the scan cards no
longer depend on them.

The nav store needs a small read surface for this. The current selectors can
read primary star-map nodes, direct-edge booleans, and target-specific known
paths, but they cannot select canonical user edges by id or generic nav nodes
by id. Add selectors and resolvers that let consumers request a set of edge ids
and node ids from datacore and receive empty arrays while those records are not
available locally. These reads should not trigger network fetches themselves.
Reconciliation remains responsible for importing canonical rows into datacore.

The scan result contract can then shrink toward event data and stable summary
fields. The result should continue to carry the immutable execution inputs that
the resolver and active UI need, such as duration and efficiency. Completed
results should keep discovery identifiers and any summary values the scan log
needs, but should no longer require embedded node or edge payloads for normal
card rendering.

This task is about separating scan action presentation from graph storage. It
should not change scan generation, edge ownership, route discovery rules, or
the canonical `/helm/v1/edges` shape.

## Requirements

- Scan cards must not treat `action.result.edges` or `action.result.nodes` as
  canonical navigation graph data.
- Completed scan cards should select available edge and node information from
  the nav store using `discovered_edge_ids` and `discovered_node_ids`.
- The nav store must expose a read for canonical user edges by id that returns
  only locally available datacore rows and defaults to an empty array.
- The nav store must expose a read for nav nodes by id that returns only
  locally available datacore rows and defaults to an empty array.
- Nav selectors used by the cards should return empty arrays or equivalent
  empty values when referenced graph data is not available yet.
- These selectors must not infer readiness from action history or fetch
  canonical data from scan action payloads.
- Cards must render useful incomplete states when selected graph data is empty
  because reconciliation is still in flight.
- Active scan cards must continue to render duration, efficiency, distance,
  and progress from the active action result and action params.
- Review whether `edges_discovered`, `waypoints_created`, and `path` are still
  needed as stable scan-log summary fields once cards select graph data from
  nav.
- Remove transitional embedded `edges` and `nodes` from scan route results only
  after card and map consumers no longer depend on them.
- Update the action TypeScript contracts, scan stories, card tests, and
  WPUnit resolver tests to match the final scan result shape.
- Update `ScanRoute\Resolver` so completed scan results stop writing embedded
  `edges` and `nodes` once all consumers have moved to discovered ids and nav
  selectors.
- Do not add `discovered_at` or canonical edge distance back to scan action
  result edges.
- Tests must cover fulfilled scan cards with available nav graph data,
  fulfilled scan cards while graph data is unavailable, and active scan cards
  without embedded discovery payloads.
