# Helm

A slow, asynchronous space exploration game built on WordPress.

## Conversational Style

- Keep answers short and concise
- No emojis in commits, issues, PR comments, or code
- No fluff or cheerful filler text
- Technical prose only, be kind but direct

## What This Is

Helm is a space MMO where WordPress is the game server. Players are WordPress users. Ships are player-owned entities stored as data. The game runs on a single WordPress instance (the "Origin") that tracks all state, processes work, and manages the economy.

Actions take real time. Scans take hours. Travel takes days. You check in between meetings, before bed, over morning coffee.

For the full vision, see `docs/vision.md`. For the lore, see `docs/lore.md`.

## Development Status

Helm is in active development, not a live game. Some features and controls are intentionally unfinished while gameplay decisions remain open. Distinguish known, deferred work from regressions; do not treat every loose end as a release blocker or implement behavior without an agreed design.

Active action cancellation is intentionally deferred. The Cancel controls are not wired yet. We have not decided what canceling a scan or jump means—for example, whether canceling a jump drops the ship out of hyperspace mid-leg, creates a new waypoint, or whether players should be able to create waypoints that way. Do not infer cancellation semantics from the presence of a button.

## Core Concepts

### ShipLink

ShipLink is the abstraction layer for ship state.

### Timestamp-Based State

State is calculated from the last known value plus elapsed time. State is always accurate on demand. Background ticks handle complex interactions and fire threshold events.

### DSP

DSP is the scanning and detection engine. It is modeled after submarine warfare. Ship actions emit waves through subspace, and sensors detect those waves against a noise floor. See `docs/dev/dsp.md`.
