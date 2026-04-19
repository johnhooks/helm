# Helm

A slow, asynchronous space exploration game built on WordPress.

## What This Is

Helm is a space MMO where WordPress is the game server. Players are WordPress users. Ships are player-owned entities stored as data. The game runs on a single WordPress instance (the "Origin") that tracks all state, processes work, and manages the economy.

Actions take real time. Scans take hours. Travel takes days. You check in between meetings, before bed, over morning coffee.

For the full vision, see `docs/vision.md`. For the lore, see `docs/lore.md`.

## Core Concepts

### ShipLink

ShipLink is the abstraction layer for ship state.

### Timestamp-Based State

State is calculated from the last known value plus elapsed time. State is always accurate on demand. Background ticks handle complex interactions and fire threshold events.

### DSP

DSP is the scanning and detection engine. It is modeled after submarine warfare. Ship actions emit waves through subspace, and sensors detect those waves against a noise floor. See `docs/dev/dsp.md`.
