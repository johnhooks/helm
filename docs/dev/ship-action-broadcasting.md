# Ship Action Broadcasting

How ship actions reach clients. The transport is swappable; the data shape is not.

## The Invariant

A `ship_action` has the same serialized shape everywhere — database, REST response, push payload, client store. The client doesn't know or care how the action arrived. It receives a `ship_action`, drops it into its local timeline store, and the UI reacts.

This means the broadcast mechanism is a transport concern, not a data concern.

## Pipeline

```
Batch tick / Action handler
        │
        ▼
  ship_action written to DB
        │
        ▼
  Broadcast layer (transport-specific)
        │
        ▼
  Client receives serialized ship_action
        │
        ▼
  Client appends to local store → UI updates
```

Processing and notification are decoupled. The batch tick (passive scans) or action handler (jump, fire, scan) writes ship_actions to the database. It doesn't know about clients. A separate broadcast concern delivers them.

## Current: REST Polling

The client polls the timeline REST endpoint on an interval.

```
GET /helm/v1/ship/{id}/actions?since={timestamp}
```

Returns all ship_actions created after `since`. The client merges them into its local store.

**Tradeoffs:**

-   Simple. No infrastructure beyond WordPress.
-   Works while the player is away — actions accumulate, next poll picks them all up.
-   Wasteful when nothing has changed. Every poll is a query.
-   Latency is bounded by poll interval. A 30s poll means up to 30s delay on new events.

For the current stage of the game (async, check-in-when-you-want), polling is fine. Players aren't watching a real-time battle — they're checking what happened since their last visit.

## Future: WebSocket Push

When real-time matters (active combat, coordinated fleet actions), switch to WebSocket push. The model from `sync-saas` with Laravel Reverb scales well:

1. Server writes ship_action to DB
2. Broadcast layer serializes the action and pushes to the ship's channel
3. Client receives the full payload and appends to store

```
Channel: ship.{ship_id}
Payload: serialized ship_action (same shape as REST response)
```

**What changes:** The transport. Instead of the client pulling, the server pushes.

**What doesn't change:** The ship_action shape, the client store, the UI rendering, the REST endpoint (still needed for initial load and catch-up).

### Catch-Up on Reconnect

WebSocket connections drop. When the client reconnects, it needs actions it missed. Same `?since={timestamp}` REST call. The polling endpoint never goes away — it becomes the fallback.

### Batch Broadcast

The passive scan batch tick creates many ship_actions across many ships in one run. Rather than pushing each individually:

1. Batch tick writes N actions across M ships
2. Broadcast layer groups by ship_id
3. One push per ship with all new actions

This matches how sync-saas batches site_action broadcasts — one message per entity with the full set of changes.

## The Switch

The broadcast layer is behind an interface. Current implementation polls. Future implementation pushes. The contract:

```
For each new ship_action:
  → serialize to the standard shape
  → deliver to the owning ship's client
```

How "deliver" works is the implementation detail. The rest of the system — action handlers, batch ticks, client store, UI — doesn't change.

## Not in Scope

-   **Authentication/authorization on channels** — WebSocket channel auth is a Reverb/WP concern, not a game design concern.
-   **Multi-ship views** (fleet commander seeing all ships) — future channel subscription model.
-   **Cross-origin broadcasting** (federation) — each Origin broadcasts its own ships. Federation protocol is separate.
