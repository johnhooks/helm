---
status: draft
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

Use WordPress Heartbeat as the first transport for the broadcast outbox. The client should send the last successfully applied broadcast event id. Heartbeat should return authorized events after that cursor, ordered by event id, without serializing unrelated REST resources inside the callback.

The frontend should route returned events through shared broadcast handlers. Snapshot and patch events should update the relevant stores directly. Pull-hint events should call the existing fetch paths. The client should advance its cursor only after all returned events are applied successfully, so failed fetches retry on the next heartbeat.
