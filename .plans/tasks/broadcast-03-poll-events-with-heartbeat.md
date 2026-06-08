---
status: done
area: dev
priority: p1
depends_on:
    - broadcast-01-add-event-outbox
    - broadcast-02-publish-ship-events
---

# Poll broadcast events with heartbeat

## Problem

The current heartbeat callback is a ship-action-specific delivery path. It returns action payloads and advances from server time, which does not mean the client successfully applied any updates. This makes retries, ship state refresh, and future WebSocket compatibility harder than they need to be.

## Proposed solution

Use WordPress Heartbeat as the first transport for the broadcast outbox. The client should send the last successfully applied broadcast event id. For the initial implementation, the server should resolve the current user's ship and return events for `private-ship.{shipId}` where `id` is greater than the cursor, ordered by event id. The callback should not serialize unrelated REST resources inline.

Use a broadcast-specific Heartbeat payload instead of extending the old ship-action timestamp protocol. Empty responses should keep the requested cursor rather than advancing to a global server time. When events are returned, the response cursor should be the id of the last returned event.

The frontend should route returned events through shared broadcast handlers keyed by `event_type`. Each event type owns its payload contract, so handlers know whether to upsert a snapshot, apply a patch, or call an existing fetch path. The client should advance its stored cursor only after all returned events are applied successfully, so failed fetches retry on the next heartbeat. Stale or pruned cursor recovery belongs in `broadcast-04-handle-stale-event-cursors.md`.
