# Celestial Discoverability

## Problem

The `/nodes/{id}/celestials` endpoint returns all celestial objects at a node — stars, stations, and anomalies. Even with authentication, any logged-in player can enumerate node IDs and discover everything without scanning.

Stars are publicly visible (you can see them in the sky), but stations and anomalies are discoveries that should require in-game effort (scanning, exploration) to reveal.

## Questions to Resolve

### What can a player see without scanning?

-   Stars at a node? (Probably yes — they're visible celestial objects.)
-   Station presence? Station type? Station name?
-   Anomaly presence? Anomaly type?
-   Should there be partial reveals? (e.g., "unknown signal detected" before a full scan resolves it)

### How is discovery tracked?

-   Per-player? (Player A scans a node, only Player A sees the station)
-   Per-ship? (Ship's sensors determine what's visible)
-   Shared? (Once anyone scans, it's visible to all — like EVE's probe scanning)
-   Some mix? (Stars shared, stations per-player until docked, anomalies per-scan)

### Where does filtering happen?

-   **API level**: Endpoint checks player's discoveries and filters response. Simple, but the API becomes player-specific.
-   **Service level**: `CelestialService::getNodeContents()` accepts a player/ship context and filters. Keeps the controller thin.
-   **Separate endpoint**: `/ships/{id}/scan-results/{nodeId}` returns what that ship knows. Celestials endpoint stays internal/admin-only.

### What about the scan lifecycle?

-   Does scanning a node reveal all celestials at once?
-   Or do different scan types/depths reveal different things? (Quick scan finds stations, deep scan finds anomalies)
-   Can things be hidden again? (Anomaly despawns, station cloaks)

## Possible Approaches

### 1. Discovery table

A `helm_discoveries` table tracking what each player has discovered:

```
player_id | celestial_id | discovered_at | scan_depth
```

The celestials endpoint filters results against this table.

### 2. Ship-scoped scan results

Scan results are stored per-ship as part of ship state. The endpoint is ship-scoped: `/ships/{id}/node/{nodeId}/celestials`. No discovery table — if you want to see what's at a node, query through your ship.

### 3. Visibility tiers

Each celestial type has a visibility tier:

-   **Public**: Stars — always visible to everyone
-   **Passive**: Stations — visible when within sensor range (no active scan needed)
-   **Active**: Anomalies — only revealed by active scanning

The endpoint returns results filtered by the player's current capabilities.

## Decision

TBD — needs design review before implementing.
