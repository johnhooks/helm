---
status: draft
area: dev
priority: p1
---

# Add a broadcast event outbox

## Problem

Helm's live update path is currently tied to ship action heartbeat responses. That makes heartbeat carry resource delivery concerns and gives the client no durable, ordered stream of what changed. It also makes the future Laravel Reverb direction harder because there is no shared event model that both polling and WebSocket transports can deliver.

## Proposed solution

Add a Helm broadcast event outbox. Broadcast events should be durable, ordered, channel-scoped records with an event type, payload strategy, payload data, and created time. The event id should be the client cursor. Heartbeat can poll this outbox now, and a future WebSocket transport can push the same events later.

The outbox should support snapshot, patch, and pull-hint payloads as described in `docs/dev/broadcasting.md`. It should not be specific to ship actions, although ship action and ship state updates are the first use cases.
