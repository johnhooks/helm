---
status: draft
---

# Enforce waypoint visibility on the backend

## Problem

The navigation design says waypoint nodes are only supposed to become visible
to a player after one of that player's discoveries references them. In
practice, the current node REST surface exposes waypoint rows globally, and the
client can load them without the server checking whether the authenticated
player has actually discovered the related route data.

That is acceptable as a temporary development shortcut while the navigation
sync work is being wired up, but it is not the intended fog-of-war model. The
client should not be trusted to decide which hidden waypoint nodes a player is
allowed to see. If waypoint visibility is only enforced in frontend code, the
backend contract is wrong and any deployed client can bypass it.

## Proposed solution

Add a backend-enforced visibility rule for waypoint node access so the server
only returns waypoint coordinates the authenticated player is allowed to know.
The authorized set should be derived from the player's discovered navigation
state rather than from public node storage alone.

This can take the form of tighter filtering on existing node endpoints, a
purpose-built endpoint for loading authorized waypoint nodes, or another small
REST surface that keeps the permission check on the server. The important
outcome is that client sync and on-demand waypoint loads stop relying on a
globally readable waypoint list.

The task should preserve the current public behavior for stars and system
nodes, and it should remain compatible with the user-edge sync flow that
hydrates the client datacore from `/helm/v1/edges`. In particular, the
authorized waypoint load path should be explicit:

- During user-edge sync, the client loads the player's discovered edges from
  `/helm/v1/edges`, derives the referenced waypoint node ids, requests the
  authorized waypoint nodes from the server, writes those nodes into datacore,
  and only then writes the edges that reference them.
- During on-demand waypoint loads, the client uses that same authorized node
  surface instead of the globally readable node list. A known waypoint id is
  not enough on its own; the backend still decides whether that waypoint is in
  the player's discovered set.
- The client should not have to know how to prove authorization. It supplies
  node ids or uses a player-scoped waypoint route, and the server applies the
  join against per-player discovery state.

It does not need to solve team sharing or public-route promotion. It only
needs to make private waypoint visibility a backend concern and provide a
datacore-safe load path for authorized waypoint rows.
