---
status: draft
---

# Sync user edges on load

## Problem

The backend now persists per-player edge discoveries in `helm_user_edge`, and
the client datacore can store and query those records locally. What is still
missing is the sync layer that moves server state into the datacore at the
times the product already promises a refresh.

Today the navigation sync flow only fetches nodes and stars. The bridge can
hydrate an old local cache and stop there, which means a player can load the
game with stale route knowledge even though the server has a newer edge graph.
The manual Sync action on the settings page has the same gap. It refreshes the
global node and star cache but leaves the per-player edge cache untouched.

That split undermines the whole point of moving route knowledge onto the
server. A fresh device, a returning session, or a manual sync should all leave
the datacore with the same discovered-edge view the authenticated player has on
the backend.

## Proposed solution

Extend the navigation sync functionality so user-edge data is refreshed into
datacore as the second phase of the existing node and star sync. The same sync
contract should cover the two user-visible entry points that already exist
today: initial bridge load and the settings page Sync command.

On first nav bootstrap of a session, the app should initialize datacore and
hydrate cached star-map state as it does today. If there is no cached nav
state, it should fall back to the existing node and star sync. After that
baseline step completes, whether by hydrate or by node sync, the flow should
reconcile the local `user_edges` table against `/helm/v1/edges` using the
response metadata the endpoint actually returns today, and update the local
cache when the server view is newer or different.

The sync operation should continue to treat the server as the source of truth.
When a refresh is needed, the client loads the user-edge rows from the server
across all pages of the paginated collection, then replaces the local
user-edge cache inside datacore transaction boundaries.
Waypoint node loading can remain on demand for now, using the existing global
node visibility behavior until the backend exposes a stricter authorized
surface. Re-running the same sync without server changes must leave the cache
in the same state.

Manual Sync in the settings page should invoke that same edge-aware sync path
rather than inventing a second implementation. One command should refresh the
navigation cache as a whole, including nodes, stars, and the authenticated
player's discovered edges.

The paginated edge fetch should mirror the existing node sync behavior. The
client must follow `X-WP-TotalPages` until it has the complete edge set before
it clears and replaces local `user_edges`.

This task is only about the sync and hydrate wiring. It does not add heartbeat
reconcile for newly fulfilled scan actions, and it does not change the REST
shape exposed by `/helm/v1/edges`. Tightening waypoint visibility so the
backend, not the client, enforces which waypoint nodes a player may load is a
follow-up task.
