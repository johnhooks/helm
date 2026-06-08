---
status: done
area: dev
priority: p1
---

# Add a broadcast event outbox

## Problem

Helm's live update path is currently tied to ship action heartbeat responses. That makes heartbeat carry resource delivery concerns and gives the client no durable, ordered stream of what changed. It also makes the future Laravel Reverb direction harder because there is no shared event model that both polling and WebSocket transports can deliver.

## Proposed solution

Add a Helm broadcast event outbox. Broadcast events should be durable, ordered, channel-scoped records with an event type, payload data, optional resource reference, and created time. The event id should be the client cursor. Heartbeat can poll this outbox now, and a future WebSocket transport can push the same events later.

The outbox should not be specific to ship actions, although ship action and ship state updates are the first use cases. Use `helm_broadcast_events` as the table name. The initial table should store `id`, `channel`, `event_type`, `payload`, `resource_type`, `resource_id`, and `created_at`. The `channel,id` index is required because the first polling path will read `private-ship.{shipId}` events after a cursor.

Do not store a payload strategy column. Each event type owns its payload contract, and the browser should route events by `event_type` to handlers that know whether to upsert a snapshot, apply a patch, or fetch canonical resources. The optional `resource_type` and `resource_id` columns identify what the event is about for lookup and diagnostics, not delivery authorization.
